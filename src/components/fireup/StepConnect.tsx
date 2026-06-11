/**
 * LAUNCH step 3 — Connect Tools (body only; chrome from WizardShell).
 *
 * Connect-tile grid from src/mock/connectors.ts: blueprint-suggested live
 * tiles first ("Suggested" chip + readiness chip "{n}/{t} suggested
 * connected"), roadmap tiles in "More connectors" (Request-access only,
 * optional ones marked Optional). Clicking a live tile opens ConnectDialog
 * (mock OAuth + status write-back for ticketing). Gating per D2: an
 * unconnected suggested LIVE connector flags amber — never blocks.
 *
 * Once a ticketing connector is connected, the "Scope the work" expander
 * (sub-screen 3b, StepScope) appears below the grids.
 */

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Crosshair,
  Figma,
  FolderOpen,
  GitBranch,
  GitMerge,
  KanbanSquare,
  ListTodo,
  Loader2,
  Mail,
  MessageSquare,
  MessagesSquare,
  NotebookText,
  ShieldCheck,
  SquareKanban,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePods, TENANCY_LINE } from "@/lib/pods/pod-store";
import { scopedCount } from "@/mock/backlog";
import { blueprintById } from "@/mock/blueprints";
import { CONNECTORS, type Connector, type ConnectorId } from "@/mock/connectors";
import { ConnectDialog } from "./ConnectDialog";
import { StepScope } from "./StepScope";

const CONNECTOR_ICONS: Record<ConnectorId, LucideIcon> = {
  teamwork: KanbanSquare,
  slack: MessageSquare,
  github: GitBranch,
  jira: SquareKanban,
  gdrive: FolderOpen,
  email: Mail,
  teams: MessagesSquare,
  linear: ListTodo,
  gitlab: GitMerge,
  figma: Figma,
  notion: NotebookText,
};

const MOCK_LATENCY_MS: Record<ConnectorId, number> = {
  teamwork: 96,
  slack: 88,
  github: 142,
  jira: 134,
  gdrive: 118,
  email: 64,
  teams: 0, // roadmap — request-access only, never "connects"
  linear: 92,
  gitlab: 151,
  figma: 127,
  notion: 109,
};

function LiveRoadmapBadge({ availability }: { availability: Connector["availability"] }) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border shrink-0",
        availability === "live"
          ? "border-status-done/50 bg-status-done/10 text-status-done"
          : "border-border bg-white/5 text-muted-foreground",
      )}
    >
      {availability === "live" ? "Live" : "Roadmap"}
    </span>
  );
}

function ConnectorTile({
  connector,
  suggested,
  optional,
  connected,
  probing,
  scopedTickets,
  onConnect,
  onScope,
}: {
  connector: Connector;
  suggested: boolean;
  optional: boolean;
  connected: boolean;
  probing: boolean;
  scopedTickets: number | null;
  onConnect: () => void;
  onScope?: () => void;
}) {
  const Icon = CONNECTOR_ICONS[connector.id];
  const roadmap = connector.availability === "roadmap";
  const needsAttention = suggested && !roadmap && !connected;

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-panel/40 backdrop-blur-md p-4 flex flex-col gap-3 transition-colors",
        roadmap && "opacity-70",
        needsAttention && "ring-1 ring-status-waiting/40",
        connected && "border-status-done/30",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "size-9 rounded-md grid place-items-center border shrink-0",
            connected
              ? "bg-status-done/10 border-status-done/40 text-status-done"
              : "bg-primary/10 border-primary/30 text-primary",
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{connector.name}</span>
            <LiveRoadmapBadge availability={connector.availability} />
          </div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mt-0.5">
            {connector.category} · {connector.direction}
          </div>
        </div>
      </div>

      {(suggested || optional || needsAttention || scopedTickets !== null) && (
        <div className="flex flex-wrap gap-1.5">
          {suggested && (
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-primary/40 bg-primary/10 text-primary">
              Suggested
            </span>
          )}
          {optional && (
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-border bg-white/5 text-muted-foreground">
              Optional
            </span>
          )}
          {needsAttention && (
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-waiting/50 bg-status-waiting/10 text-status-waiting">
              Required
            </span>
          )}
          {scopedTickets !== null && (
            <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/50 bg-status-done/10 text-status-done">
              Scoped · {scopedTickets} tickets
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground flex-1">{connector.description}</p>

      {/* Status line */}
      <div className="flex items-center gap-1.5 text-[11px] font-mono">
        {probing ? (
          <>
            <Loader2 className="size-3 animate-spin text-primary" />
            <span className="text-muted-foreground">Checking…</span>
          </>
        ) : connected ? (
          <>
            <CheckCircle2 className="size-3 text-status-done" />
            <span className="text-status-done">
              Healthy · checked just now · {MOCK_LATENCY_MS[connector.id]} ms
            </span>
          </>
        ) : roadmap ? (
          <span className="text-muted-foreground/70">
            On our roadmap — request access to be notified.
          </span>
        ) : (
          <>
            <Circle className="size-3 text-muted-foreground/50" />
            <span className="text-muted-foreground">Not connected</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {roadmap ? (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-muted-foreground"
            onClick={() =>
              toast(`Logged — we'll notify you when ${connector.name} is live`, {
                description: "No credentials requested for roadmap connectors.",
              })
            }
          >
            Request access
          </Button>
        ) : connected ? (
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={onConnect}>
              Manage
            </Button>
            {onScope && (
              <Button variant="outline" size="sm" className="flex-1" onClick={onScope}>
                <Crosshair className="size-3.5" />
                Scope the work
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" className="flex-1" onClick={onConnect} disabled={probing}>
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

export function StepConnect() {
  const { draft, hydrated } = usePods();
  const [dialogId, setDialogId] = useState<ConnectorId | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [probingIds, setProbingIds] = useState<ConnectorId[]>([]);
  const [scopeOpen, setScopeOpen] = useState(false);

  const blueprint = blueprintById(draft?.blueprintId ?? null);
  // No-blueprint fallback (direct ?step=connect deep-link): suggest only the
  // production first wave — with nearly every connector now demo-connectable,
  // falling back to ALL live ids would amber-flag the whole shelf.
  const FIRST_WAVE: ConnectorId[] = ["teamwork", "slack", "github"];
  const suggestedIds: ConnectorId[] =
    blueprint && blueprint.connectorIds.length > 0 ? blueprint.connectorIds : FIRST_WAVE;
  const optionalIds = new Set(blueprint?.optionalConnectorIds ?? []);

  const connectedIds = useMemo(
    () =>
      new Set(
        (draft?.connections ?? [])
          .filter((c) => c.status === "connected")
          .map((c) => c.connectorId),
      ),
    [draft?.connections],
  );

  const suggested = suggestedIds
    .map((id) => CONNECTORS.find((c) => c.id === id))
    .filter((c): c is Connector => Boolean(c));
  const more = CONNECTORS.filter((c) => !suggestedIds.includes(c.id));

  const suggestedConnected = suggested.filter((c) => connectedIds.has(c.id)).length;
  const allSuggestedConnected = suggestedConnected === suggested.length && suggested.length > 0;

  const ticketingConnected = CONNECTORS.find(
    (c) => c.category === "ticketing" && c.availability === "live" && connectedIds.has(c.id),
  );
  const scopeRule = draft?.scopeRule;
  const scopedTickets = scopeRule?.projectKey ? scopedCount(scopeRule) : null;

  const openDialog = (id: ConnectorId) => {
    setDialogId(id);
    setDialogOpen(true);
  };

  const handleConnected = (id: ConnectorId) => {
    setProbingIds((ids) => [...ids, id]);
    setTimeout(() => setProbingIds((ids) => ids.filter((x) => x !== id)), 900);
    // The brownfield beat: connecting a ticketing tool surfaces Scope of Work.
    const connector = CONNECTORS.find((c) => c.id === id);
    if (connector?.category === "ticketing") setScopeOpen(true);
  };

  if (!hydrated) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data-handling banner */}
      <Alert className="bg-panel/40 border-border backdrop-blur-md">
        <ShieldCheck className="size-4" />
        <AlertDescription className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">{TENANCY_LINE}.</span> Tools connect into
          this pod only. Credentials are vaulted per client (mocked in this prototype).
        </AlertDescription>
      </Alert>

      {/* Suggested / required */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground flex-1">
            Required for your agents
          </h2>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded-md border",
              allSuggestedConnected
                ? "border-status-done/50 bg-status-done/10 text-status-done"
                : "border-status-waiting/50 bg-status-waiting/10 text-status-waiting",
            )}
          >
            {suggestedConnected} / {suggested.length} required connected
          </span>
        </div>
        {allSuggestedConnected && (
          <div className="flex items-center gap-1.5 text-xs text-status-done">
            <CheckCircle2 className="size-3.5" />
            All suggested tools connected — the board can send work in and the pod can post back.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggested.map((c) => (
            <ConnectorTile
              key={c.id}
              connector={c}
              suggested
              optional={false}
              connected={connectedIds.has(c.id)}
              probing={probingIds.includes(c.id)}
              scopedTickets={c.category === "ticketing" ? scopedTickets : null}
              onConnect={() => openDialog(c.id)}
              onScope={
                c.category === "ticketing" && connectedIds.has(c.id)
                  ? () => setScopeOpen((v) => !v)
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Scope of work (3b) — appears once a ticketing connector is connected */}
      {ticketingConnected && (
        <section className="rounded-md border border-border bg-panel/20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setScopeOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
          >
            <div className="size-8 rounded-md bg-primary/10 border border-primary/30 grid place-items-center text-primary shrink-0">
              <Crosshair className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Scope of work</div>
              <div className="text-xs text-muted-foreground">
                Pick the slice of your backlog this pod owns. You can widen it any time.
              </div>
            </div>
            {scopedTickets !== null && (
              <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border border-status-done/50 bg-status-done/10 text-status-done shrink-0">
                Scoped · {scopedTickets} tickets
              </span>
            )}
            {scopeOpen ? (
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            )}
          </button>
          {scopeOpen && (
            <div className="px-4 pb-4 border-t border-border pt-4">
              <StepScope connectorId={ticketingConnected.id} />
            </div>
          )}
        </section>
      )}

      {/* More connectors */}
      <section className="space-y-3">
        <h2 className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          More connectors
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {more.map((c) => (
            <ConnectorTile
              key={c.id}
              connector={c}
              suggested={false}
              optional={optionalIds.has(c.id)}
              connected={connectedIds.has(c.id)}
              probing={probingIds.includes(c.id)}
              scopedTickets={null}
              onConnect={() => openDialog(c.id)}
            />
          ))}
        </div>
      </section>

      <ConnectDialog
        connectorId={dialogId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConnected={handleConnected}
      />
    </div>
  );
}
