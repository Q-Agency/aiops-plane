import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  type LucideIcon,
  ArrowRight,
  BarChart3,
  Blocks,
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  FileCheck2,
  GitBranch,
  Headset,
  Layers,
  Link2,
  Loader2,
  Megaphone,
  Plus,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  AGENT_PACKS,
  CONTRACT_VERSION,
  DOMAIN_SUGGESTED_TOOLS,
  GOVERNANCE_REQUIREMENTS,
  SAMPLE_CARDS,
  catalogStats,
  validateAgentCard,
  type AgentCard,
  type AgentDomain,
} from "@/mock/registry";
import { CONNECTORS, type ConnectorId } from "@/mock/connectors";
import { MODEL_OPTIONS, modelShort } from "@/mock/agent-config";
import { humans } from "@/mock/humans";
import { appendAuditMock } from "@/mock/audit-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockOnlyBeforeLoad } from "@/lib/experience";

export const Route = createFileRoute("/registry")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Agent Registry" }] }),
  component: RegistryView,
});

const PACK_ICON: Record<string, LucideIcon> = {
  git: GitBranch,
  headset: Headset,
  megaphone: Megaphone,
  chart: BarChart3,
  shield: ShieldCheck,
  wallet: Wallet,
  users: Users,
  scale: Scale,
};

const STATS = catalogStats();

/** The configure-on-register choices (custom agents get a scoped setup, not blanket access). */
interface AgentRegistration {
  tools: ConnectorId[];
  ownerId: string;
  /** "agent-managed" (its own engine) or a Q model-plane model id. */
  inference: string;
}

type RegisteredAgent = AgentCard & { config: AgentRegistration };

// ----------------- view -----------------

function RegistryView() {
  // Which domain packs are in the fleet (SDLC ships installed). Demo-local.
  const [installed, setInstalled] = useState<Set<AgentDomain>>(
    () => new Set(AGENT_PACKS.filter((p) => p.installed).map((p) => p.domain)),
  );
  // Custom-agent registration flow.
  const [url, setUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [card, setCard] = useState<AgentCard | null>(null);
  const [registered, setRegistered] = useState<RegisteredAgent[]>([]);

  const installedAgentCount =
    AGENT_PACKS.filter((p) => installed.has(p.domain)).reduce(
      (n, p) => n + p.agents.length,
      0,
    ) + registered.length;

  function addPack(domain: AgentDomain) {
    setInstalled((prev) => new Set(prev).add(domain));
  }

  function onValidate() {
    if (!url.trim() || validating) return;
    setValidating(true);
    setCard(null);
    // simulate the card fetch + contract check (UI only — data is deterministic)
    setTimeout(() => {
      setCard(validateAgentCard(url));
      setValidating(false);
    }, 650);
  }

  function onRegister(config: AgentRegistration) {
    if (!card) return;
    setRegistered((prev) => [
      { ...card, config },
      ...prev.filter((c) => c.url !== card.url),
    ]);
    const ownerName = humans.find((h) => h.id === config.ownerId)?.name ?? "—";
    appendAuditMock({
      action: "agent.registered",
      target: card.name,
      detail: `${card.domain} · ${config.tools.length} tools · ${
        config.inference === "agent-managed"
          ? "agent-managed inference"
          : `inference via Q model plane (${modelShort(config.inference)})`
      } · owner ${ownerName} · starts at L0`,
    });
    toast.success(`${card.name} registered into the fleet`, {
      description: "Governed at L0 (review all) — agent.registered written to the ledger.",
    });
    setCard(null);
    setUrl("");
  }

  function tryExample(u: string) {
    setUrl(u);
    setCard(null);
  }

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col min-h-0 gap-4 overflow-y-auto scrollbar-thin">
      {/* header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            platform · agent-agnostic
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Agent Registry</h1>
          <div className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Bring <span className="text-foreground">any</span> agent under governance — not just
            SDLC. The control plane governs agents, not a fixed workflow: anything that speaks the
            contract joins the fleet, gated and audited like the rest.
          </div>
        </div>
        <Link
          to="/agents"
          className="text-[11px] font-mono text-muted-foreground hover:text-foreground glass-panel px-3 py-1.5 inline-flex items-center gap-1.5"
        >
          <Bot className="size-3" /> operating roster <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* thesis — why any agent is governable */}
      <section className="glass-panel p-4 lg:p-5">
        <div className="grid lg:grid-cols-[1.05fr_1.45fr] gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              the rule
            </div>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              Any agent that speaks the contract is governable.
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              A refund approval and a deploy approval are the{" "}
              <span className="text-foreground">same gate</span> — so the platform doesn't care
              whether an agent ships code, closes tickets or reconciles invoices. Meet four
              obligations and it's in the fleet.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {GOVERNANCE_REQUIREMENTS.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-border bg-white/[0.02] p-2.5 flex gap-2"
              >
                <CheckCircle2 className="size-4 text-status-done shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium">{r.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi icon={Boxes} label="Domains in catalog" value={`${STATS.domains}`} sub="SDLC + 7 more" />
        <Kpi icon={Bot} label="Agents available" value={`${STATS.agents}`} sub="across the catalog" />
        <Kpi
          icon={CheckCircle2}
          label="In this pod's fleet"
          value={`${installedAgentCount}`}
          sub="governed right now"
          tone="positive"
        />
        <Kpi icon={FileCheck2} label="Contract" value={CONTRACT_VERSION} sub="A2A-aligned envelope" />
      </section>

      {/* catalog — packs by domain */}
      <section className="space-y-2">
        <SectionHead
          icon={Layers}
          title="Agent catalog"
          sub="SDLC ships installed · everything else is one click into the fleet"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {AGENT_PACKS.map((pack) => {
            const Icon = PACK_ICON[pack.icon] ?? Blocks;
            const isIn = installed.has(pack.domain);
            return (
              <div key={pack.domain} className="glass-panel p-4 flex flex-col gap-3">
                <header className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "size-9 rounded-md grid place-items-center shrink-0 border",
                      isIn
                        ? "bg-status-done/10 border-status-done/30 text-status-done"
                        : "bg-primary/10 border-primary/30 text-primary",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{pack.label}</h3>
                      {isIn && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-status-done/40 text-status-done bg-status-done/10">
                          <Check className="size-2.5" /> installed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pack.blurb}</p>
                  </div>
                </header>

                <ul className="space-y-1.5">
                  {pack.agents.map((a) => (
                    <li key={a.id} className="flex items-start gap-2 text-[11px]">
                      <span className="size-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                      <span>
                        <span className="font-medium text-foreground">{a.name}</span>
                        <span className="text-muted-foreground"> — {a.role}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <footer className="mt-auto pt-1">
                  {isIn ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-status-done flex-wrap">
                      <ShieldCheck className="size-3.5" /> governed by this pod
                      {pack.domain === "sdlc" && (
                        <Link
                          to="/agents"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          · tune per agent <ArrowRight className="size-3" />
                        </Link>
                      )}
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => addPack(pack.domain)}
                    >
                      <Plus className="size-3.5" /> Add to fleet
                    </Button>
                  )}
                </footer>
              </div>
            );
          })}
        </div>
      </section>

      {/* register a custom agent */}
      <section className="space-y-2">
        <SectionHead
          icon={Link2}
          title="Register a custom agent"
          sub="paste an Agent Card URL — any vendor, any domain"
        />
        <div className="glass-panel p-4 space-y-3">
          <p className="text-xs text-muted-foreground max-w-3xl">
            Point us at any agent's A2A card. We validate it against the contract, then bring it
            under the <span className="text-foreground">same gates, ledger and accountability</span>{" "}
            as the rest of the fleet. Not on the catalog? It still works — the contract is the only
            requirement.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onValidate()}
              placeholder="https://your-agent.example.com/.well-known/agent-card.json"
              className="font-mono text-xs"
            />
            <Button onClick={onValidate} disabled={!url.trim() || validating} className="shrink-0">
              {validating ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Validating…
                </>
              ) : (
                <>
                  <FileCheck2 className="size-4" /> Validate card
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-muted-foreground font-mono">try one:</span>
            {SAMPLE_CARDS.map((c) => (
              <button
                key={c.url}
                onClick={() => tryExample(c.url)}
                className="rounded border border-border bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {c.name}
              </button>
            ))}
          </div>

          {card && <CardPreview key={card.url} card={card} onRegister={onRegister} />}
        </div>

        {registered.length > 0 && (
          <div className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Registered this session ({registered.length})
            </div>
            {registered.map((c) => {
              const ownerName = humans.find((h) => h.id === c.config.ownerId)?.name ?? "—";
              return (
                <div key={c.url} className="glass-panel flex items-center gap-3 p-3">
                  <CheckCircle2 className="size-5 text-status-done shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-status-done/40 text-status-done bg-status-done/10">
                        <ShieldCheck className="size-2.5" /> governed
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {c.version}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        L0 · review all
                      </span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground mt-0.5">
                      {c.url}
                    </div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground/80 mt-0.5">
                      {c.config.tools.length} tools ·{" "}
                      {c.config.inference === "agent-managed"
                        ? "agent-managed inference"
                        : `via Q model plane · ${modelShort(c.config.inference)}`}{" "}
                      · {ownerName} answers for it
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                    {c.skills.length} skills
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ----------------- card preview + configure-on-register ----------------- */

function CardPreview({
  card,
  onRegister,
}: {
  card: AgentCard;
  onRegister: (config: AgentRegistration) => void;
}) {
  // Configure step — seeded per domain; a registered agent gets a SCOPED
  // setup (tools, inference, owner), never blanket access.
  const [tools, setTools] = useState<Set<ConnectorId>>(
    () => new Set(DOMAIN_SUGGESTED_TOOLS[card.domain]),
  );
  const [inferenceMode, setInferenceMode] = useState<"agent-managed" | "plane">("agent-managed");
  const [planeModel, setPlaneModel] = useState(
    "qwen2.5-coder-32b-instruct", // in-tenant default — the privacy-first pick for externals
  );
  const [ownerId, setOwnerId] = useState("zlatko");

  function toggleTool(id: ConnectorId) {
    setTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    onRegister({
      tools: [...tools],
      ownerId,
      inference: inferenceMode === "agent-managed" ? "agent-managed" : planeModel,
    });
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-3.5 space-y-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="size-9 rounded-md grid place-items-center shrink-0 border border-primary/30 bg-primary/10 text-primary">
          <Bot className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{card.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
              contract {card.version}
            </span>
            {!card.recognized && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-status-waiting border border-status-waiting/40 bg-status-waiting/10 rounded px-1.5 py-0.5">
                skills self-declared
              </span>
            )}
          </div>
          <div className="truncate font-mono text-[11px] text-muted-foreground mt-0.5 max-w-[52ch]">
            {card.url}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <Meta label="Engine" value={card.engine} />
        <Meta label="Auth" value={card.auth} />
        <Meta label="Skills" value={card.skills.join(" · ")} />
      </div>

      <div className="border-t border-border pt-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1.5">
          contract checks · all passing
        </div>
        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
          {GOVERNANCE_REQUIREMENTS.map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 text-[11px]">
              <Check className="size-3.5 text-status-done shrink-0" />
              <span className="text-foreground">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* configure before it joins */}
      <div className="border-t border-border pt-2.5 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          configure before it joins
        </div>

        <div>
          <div className="text-[10px] font-mono text-muted-foreground mb-1.5">
            tools it may touch <span className="text-muted-foreground/60">· suggested for {card.domain}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CONNECTORS.map((c) => {
              const roadmap = c.availability === "roadmap";
              const on = tools.has(c.id);
              return (
                <button
                  key={c.id}
                  disabled={roadmap}
                  onClick={() => !roadmap && toggleTool(c.id)}
                  data-test={`reg-tool-${c.id}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-colors",
                    roadmap && "opacity-50 cursor-not-allowed border-border text-muted-foreground",
                    !roadmap && on && "border-status-done/40 bg-status-done/10 text-foreground",
                    !roadmap && !on &&
                      "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                  )}
                >
                  {on && <Check className="size-3 text-status-done" />}
                  {c.name}
                  {roadmap && <span className="text-[9px] font-mono">roadmap</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground mb-1.5">inference</div>
            <div className="flex gap-1.5">
              {(
                [
                  ["agent-managed", "Agent-managed"],
                  ["plane", "Q model plane"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setInferenceMode(mode)}
                  data-test={`reg-inference-${mode}`}
                  className={cn(
                    "rounded border px-2.5 py-1.5 text-[11px] transition-colors",
                    inferenceMode === mode
                      ? "border-primary/50 bg-primary/[0.08] text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {inferenceMode === "agent-managed" ? (
              <div className="text-[10px] text-muted-foreground/80 mt-1">
                Runs its own engine — we govern its actions, not its weights.
              </div>
            ) : (
              <select
                value={planeModel}
                onChange={(e) => setPlaneModel(e.target.value)}
                data-test="reg-plane-model"
                className="mt-1.5 w-full rounded-md border border-border bg-white/[0.02] px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-panel text-foreground">
                    {m.label} — ${m.costPerRunUsd.toFixed(2)}/run ·{" "}
                    {m.hosting === "in-tenant" ? "in-tenant" : m.provider}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="text-[10px] font-mono text-muted-foreground mb-1.5">
              accountable owner
            </div>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              data-test="reg-owner"
              className="w-full rounded-md border border-border bg-white/[0.02] px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
            >
              {humans.map((h) => (
                <option key={h.id} value={h.id} className="bg-panel text-foreground">
                  {h.name} — {h.role}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-muted-foreground/80 mt-1">
              Signs its gates — someone answers for it from minute one.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-2.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <ShieldCheck className="size-3 text-primary" /> starts at L0 · review all — autonomy is
            earned on validator streaks, never granted at the door
          </span>
          <Button size="sm" onClick={submit} data-test="reg-submit" className="shrink-0">
            <Plus className="size-3.5" /> Register into fleet
          </Button>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-white/[0.02] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
        {label}
      </div>
      <div className="text-[11px] font-mono text-foreground mt-0.5 truncate">{value}</div>
    </div>
  );
}

/* ----------------- shared ----------------- */

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone?: "positive";
}) {
  return (
    <div className="glass-panel p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className="size-3" /> {label}
      </div>
      <div
        className={cn(
          "mt-1.5 text-xl font-semibold tabular-nums",
          tone === "positive" && "text-status-done",
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function SectionHead({
  icon: Icon,
  title,
  sub,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        {title}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground/70 font-mono">· {sub}</span>}
    </div>
  );
}
