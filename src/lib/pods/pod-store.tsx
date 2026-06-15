/**
 * Pod store - client-side state for the multi-pod shell + LAUNCH wizard.
 * Mock/standard-mode only: persisted to localStorage ("aiops_pods_v1"),
 * SSR-safe (initialize with the sample pod, hydrate in useEffect).
 *
 * The always-present sample pod ("automarket", badged "Sample") maps onto
 * the existing mock dataset (agents.ts / humans.ts / tickets.ts).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ChainRoleId } from "@/mock/chain";
import type { ConnectorId } from "@/mock/connectors";
import { blueprintById, type BlueprintId } from "@/mock/blueprints";
import type { LlmTier } from "@/mock/agent-config";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type WizardStepId = "blueprint" | "agents" | "connect" | "people" | "slack" | "golive";

export type SlackEventId = "clarification" | "approval" | "escalation" | "daily_brief";

export interface SlackWiringRow {
  event: SlackEventId;
  channelId: string;
  enabled: boolean;
}

export interface DraftConnection {
  connectorId: ConnectorId;
  status: "connected" | "skipped";
}

/** Brownfield slice rule (Connect sub-screen 3b) - AND semantics across fields. */
export interface ScopeRule {
  connectorId: ConnectorId;
  projectKey?: string;
  labels: string[];
  components: string[];
}

export interface PodDraft {
  id: string;
  name: string;
  blueprintId: BlueprintId | null;
  agentIds: ChainRoleId[];
  connections: DraftConnection[];
  scopeNote?: string;
  /** Structured brownfield slice - re-editable source of scopeNote. */
  scopeRule?: ScopeRule;
  /** agentId → humanId (null = uncovered). */
  accountability: Partial<Record<ChainRoleId, string | null>>;
  /** agentId → chosen LLM tier - mandatory for every agent before launch. */
  agentTiers?: Partial<Record<ChainRoleId, LlmTier>>;
  slackWiring: SlackWiringRow[];
  approverChannelId: string | null;
  launched: boolean;
  updatedAt: number;
}

export interface LaunchedPod {
  id: string;
  name: string;
  /** True only for the always-present demo pod. */
  sample?: boolean;
  status: "live" | "setup" | "paused";
  blueprintId: BlueprintId | null;
  agentIds: ChainRoleId[];
  accountability: Partial<Record<ChainRoleId, string | null>>;
  connections: DraftConnection[];
  launchedAt: number | null;
  /** "Dedicated · EU-West · isolated DB" */
  tenancyLine: string;
}

export const TENANCY_LINE = "Dedicated · EU-West · isolated DB";

export const SAMPLE_POD: LaunchedPod = {
  id: "automarket",
  name: "AutoMarket Web Pod",
  sample: true,
  status: "live",
  blueprintId: "web-app",
  agentIds: ["ba", "sa", "tasklist", "dev", "review", "qa", "knowledge"],
  accountability: {
    ba: "ana",
    sa: "marin",
    tasklist: "marin",
    dev: "ivan",
    review: "ivan",
    qa: "petra",
    // D5: 4 distinct humans (Ana/Marin/Ivan/Petra) cover 7 agents -
    // "7 agents · 4 accountable humans" (one human covers several).
    knowledge: "ana",
  },
  connections: [
    { connectorId: "teamwork", status: "connected" },
    { connectorId: "slack", status: "connected" },
    { connectorId: "github", status: "connected" },
  ],
  launchedAt: null,
  tenancyLine: TENANCY_LINE,
};

/** D5 copy: "7 agents · 4 accountable humans" (one human covers several agents). */
export function podSummaryLine(pod: Pick<LaunchedPod, "agentIds" | "accountability">): string {
  const humans = new Set(Object.values(pod.accountability).filter(Boolean));
  return `${pod.agentIds.length} agents · ${humans.size} accountable humans`;
}

/* ------------------------------------------------------------------ */
/* Readiness (steps FLAG, Readiness BLOCKS)                             */
/* ------------------------------------------------------------------ */

export function uncoveredAgents(draft: PodDraft | null): ChainRoleId[] {
  if (!draft) return [];
  return draft.agentIds.filter((id) => !draft.accountability[id]);
}

/** Selected agents that still need an LLM tier chosen (mandatory). */
export function agentsNeedingTier(draft: PodDraft | null): ChainRoleId[] {
  const tiers = draft?.agentTiers ?? {};
  return (draft?.agentIds ?? []).filter((id) => !tiers[id]);
}

export interface ReadinessCheck {
  id: "agents" | "accountability" | "llm" | "tools" | "slack";
  label: string;
  severity: "required" | "advisory";
  status: "pass" | "blocked" | "warn";
  detail: string;
  /** Wizard step that fixes this check. */
  fixStep: WizardStepId;
}

export interface DraftReadiness {
  checks: ReadinessCheck[];
  /** True while any required check fails - Launch is disabled. */
  blocked: boolean;
  uncovered: ChainRoleId[];
  /** Passed-required ÷ total-required × 100. */
  pct: number;
}

export function computeReadiness(draft: PodDraft | null): DraftReadiness {
  const uncovered = uncoveredAgents(draft);
  const needingTier = agentsNeedingTier(draft);
  const hasAgents = (draft?.agentIds.length ?? 0) > 0;

  const requiredConnectors = blueprintById(draft?.blueprintId ?? null)?.connectorIds ?? [];
  const connectedIds = new Set(
    (draft?.connections ?? []).filter((c) => c.status === "connected").map((c) => c.connectorId),
  );
  const missingTools = requiredConnectors.filter((id) => !connectedIds.has(id));

  const checks: ReadinessCheck[] = [
    {
      id: "agents",
      label: "Agents added",
      severity: "required",
      status: hasAgents ? "pass" : "blocked",
      detail: hasAgents
        ? `${draft?.agentIds.length} agents in the pod`
        : "Add at least one agent to begin. Your pod needs a team.",
      fixStep: "agents",
    },
    {
      id: "accountability",
      label: "Every agent has an accountable human",
      severity: "required",
      status: !hasAgents ? "blocked" : uncovered.length === 0 ? "pass" : "blocked",
      detail:
        hasAgents && uncovered.length === 0
          ? "Every agent has an accountable human."
          : `${uncovered.length} uncovered - assign one human per agent.`,
      fixStep: "people",
    },
    {
      id: "llm",
      label: "Every agent has an LLM tier",
      severity: "required",
      status: !hasAgents ? "blocked" : needingTier.length === 0 ? "pass" : "blocked",
      detail:
        hasAgents && needingTier.length === 0
          ? "Every agent has a model tier set."
          : `${needingTier.length} agent${needingTier.length === 1 ? "" : "s"} need an LLM tier - pick one per agent.`,
      fixStep: "agents",
    },
    {
      id: "tools",
      label: "Required tools connected",
      severity: "required",
      status: missingTools.length === 0 ? "pass" : "blocked",
      detail:
        missingTools.length === 0
          ? requiredConnectors.length > 0
            ? `${requiredConnectors.length} required tools connected`
            : "No required tools for this pod"
          : `${missingTools.length} required tool${missingTools.length > 1 ? "s" : ""} not connected`,
      fixStep: "connect",
    },
    {
      id: "slack",
      label: "Slack wired",
      severity: "advisory",
      status: draft?.approverChannelId ? "pass" : "warn",
      detail: draft?.approverChannelId
        ? "Events routed · approver channel set"
        : "Pick an approver channel so approval gates can be actioned.",
      fixStep: "slack",
    },
  ];

  const required = checks.filter((c) => c.severity === "required");
  const passed = required.filter((c) => c.status === "pass");
  return {
    checks,
    blocked: passed.length < required.length,
    uncovered,
    pct: required.length === 0 ? 100 : Math.round((passed.length / required.length) * 100),
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

interface PodsState {
  draft: PodDraft | null;
  pods: LaunchedPod[];
  activePodId: string | null;
}

const STORAGE_KEY = "aiops_pods_v1";

const DEFAULT_SLACK_WIRING: SlackWiringRow[] = [
  { event: "clarification", channelId: "automarket-dev", enabled: true },
  { event: "approval", channelId: "automarket-dev", enabled: true },
  { event: "escalation", channelId: "automarket-escalations", enabled: true },
  { event: "daily_brief", channelId: "automarket-leads", enabled: true },
];

function initialState(): PodsState {
  return { draft: null, pods: [SAMPLE_POD], activePodId: SAMPLE_POD.id };
}

function withSamplePod(stored: Partial<PodsState> | null): PodsState {
  const storedPods = Array.isArray(stored?.pods)
    ? stored.pods.filter((p): p is LaunchedPod => Boolean(p) && p.id !== SAMPLE_POD.id)
    : [];
  const pods = [SAMPLE_POD, ...storedPods];
  const activePodId =
    stored?.activePodId && pods.some((p) => p.id === stored.activePodId)
      ? stored.activePodId
      : SAMPLE_POD.id;
  return { draft: stored?.draft ?? null, pods, activePodId };
}

export interface PodsContextValue extends PodsState {
  /** False until localStorage has been read on the client (SSR-safe gate). */
  hydrated: boolean;
  activePod: LaunchedPod | null;
  /** Start (or restart) a draft from a blueprint; null = from scratch. */
  createDraft: (blueprintId: BlueprintId | null) => PodDraft;
  updateDraft: (patch: Partial<PodDraft>) => void;
  discardDraft: () => void;
  /** Convert the draft into a live pod, make it active, clear the draft. */
  launchDraft: () => LaunchedPod | null;
  setActivePod: (id: string | null) => void;
}

const PodsContext = createContext<PodsContextValue | null>(null);

export function PodProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PodsState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<PodsState>;
        // C12: ALL draft/pods updates are functional (prev => next) so
        // same-tick updates don't race - hydration must not clobber a
        // draft created before this effect ran.
        setState((prev) => {
          const next = withSamplePod(stored);
          return prev.draft && !next.draft ? { ...next, draft: prev.draft } : next;
        });
      }
    } catch {
      /* corrupt storage - keep defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const toStore: PodsState = { ...state, pods: state.pods.filter((p) => !p.sample) };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      /* storage full/unavailable - non-fatal in mock mode */
    }
  }, [state, hydrated]);

  const createDraft = useCallback((blueprintId: BlueprintId | null) => {
    const blueprint = blueprintById(blueprintId);
    const draft: PodDraft = {
      id: `pod-${Date.now().toString(36)}`,
      name: "Untitled Pod",
      blueprintId,
      agentIds: blueprint ? [...blueprint.agentIds] : [],
      connections: [],
      accountability: {},
      agentTiers: {},
      slackWiring: DEFAULT_SLACK_WIRING.map((r) => ({ ...r })),
      approverChannelId: null,
      launched: false,
      updatedAt: Date.now(),
    };
    setState((s) => ({ ...s, draft }));
    return draft;
  }, []);

  const updateDraft = useCallback((patch: Partial<PodDraft>) => {
    setState((s) =>
      s.draft ? { ...s, draft: { ...s.draft, ...patch, updatedAt: Date.now() } } : s,
    );
  }, []);

  const discardDraft = useCallback(() => {
    setState((s) => ({ ...s, draft: null }));
  }, []);

  const launchDraft = useCallback((): LaunchedPod | null => {
    let launched: LaunchedPod | null = null;
    setState((s) => {
      if (!s.draft) return s;
      const pod: LaunchedPod = {
        id: s.draft.id,
        name: s.draft.name.trim() || "Untitled Pod",
        status: "live",
        blueprintId: s.draft.blueprintId,
        agentIds: [...s.draft.agentIds],
        accountability: { ...s.draft.accountability },
        connections: [...s.draft.connections],
        launchedAt: Date.now(),
        tenancyLine: TENANCY_LINE,
      };
      launched = pod;
      return {
        draft: null,
        pods: [...s.pods.filter((p) => p.id !== pod.id), pod],
        activePodId: pod.id,
      };
    });
    return launched;
  }, []);

  const setActivePod = useCallback((id: string | null) => {
    setState((s) => ({ ...s, activePodId: id }));
  }, []);

  const value = useMemo<PodsContextValue>(
    () => ({
      ...state,
      hydrated,
      activePod: state.pods.find((p) => p.id === state.activePodId) ?? null,
      createDraft,
      updateDraft,
      discardDraft,
      launchDraft,
      setActivePod,
    }),
    [state, hydrated, createDraft, updateDraft, discardDraft, launchDraft, setActivePod],
  );

  return <PodsContext.Provider value={value}>{children}</PodsContext.Provider>;
}

export function usePods(): PodsContextValue {
  const ctx = useContext(PodsContext);
  if (!ctx) throw new Error("usePods must be used inside <PodProvider>");
  return ctx;
}
