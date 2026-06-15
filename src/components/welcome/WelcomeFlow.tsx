/**
 * WelcomeFlow - /welcome, the Welcome & Accountability Handshake (P1-O2).
 * The accountable human's first session: a role charter, a guided
 * first-gate walkthrough, and an explicit, AUDITED "Accept accountability"
 * action. Coverage isn't assigned, it's accepted - and provable.
 *
 * Single centered column (max-w-3xl), three stacked stages with slim
 * progress dots. States: fresh (CTA unlocks once the walkthrough is
 * opened) · already-accepted (collapses to the stamp via localStorage) ·
 * multiple agents (?variant=multi - Ana with two charters, one Accept
 * covers all) · deputy (?variant=deputy - covers-not-owns) · expired
 * invite (?invite=expired).
 *
 * Accept → alert-dialog → appendAuditMock("accountability.accepted") per
 * covered agent → toast → routes to "/" after a beat. The /pod matrix
 * flips Ana's amber "assigned - not yet accepted" cells to the solid "A".
 */

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpenCheck, CheckCircle2, Handshake, MailX, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { appendAuditMock } from "@/mock/audit-bridge";
import { humans } from "@/mock/humans";
import { CharterCard } from "./CharterCard";
import { FirstGateWalkthrough } from "./FirstGateWalkthrough";
import { AcceptAccountabilityPanel } from "./AcceptAccountabilityPanel";
import { recordAcceptance, useAcceptance, UNACCEPTED_HUMAN_ID } from "./acceptance";

export type WelcomeVariant = "single" | "multi" | "deputy";

/** Seeded invite personas - joins humans.ts assignments (no new dataset). */
const PERSONAS: Record<WelcomeVariant, { humanId: string; agentIds: string[]; deputyOf?: string }> = {
  // Ana, the BA Agent's accountable human (the /pod amber cell).
  single: { humanId: UNACCEPTED_HUMAN_ID, agentIds: ["ba"] },
  // Ana covering both her assigned agents - one Accept covers all.
  multi: { humanId: UNACCEPTED_HUMAN_ID, agentIds: ["ba", "pm"] },
  // Petra covers the BA Agent while Ana is OOO - covers, not owns.
  deputy: { humanId: "petra", agentIds: ["ba"], deputyOf: "Ana Kovač" },
};

export interface WelcomeFlowProps {
  variant?: WelcomeVariant;
  inviteExpired?: boolean;
}

export function WelcomeFlow({ variant = "single", inviteExpired = false }: WelcomeFlowProps) {
  const navigate = useNavigate();
  const acceptance = useAcceptance();
  const [walkthroughOpened, setWalkthroughOpened] = useState(false);
  const [walkthroughDone, setWalkthroughDone] = useState(false);
  const walkthroughRef = useRef<HTMLDivElement>(null);
  const acceptRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );

  const persona = PERSONAS[variant];
  const human = humans.find((h) => h.id === persona.humanId) ?? humans[0];
  const stage: 1 | 2 | 3 = walkthroughDone ? 3 : walkthroughOpened ? 2 : 1;

  function openWalkthrough() {
    setWalkthroughOpened(true);
    walkthroughRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function completeWalkthrough() {
    setWalkthroughDone(true);
    acceptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function accept() {
    let firstLedgerId: number | null = null;
    for (const agentId of persona.agentIds) {
      const entry = appendAuditMock({
        action: "accountability.accepted",
        target: agentId,
        detail: persona.deputyOf
          ? `deputy coverage accepted via /welcome - accountability stays with ${persona.deputyOf}`
          : "accepted via /welcome - coverage is accepted, not assigned",
        actorName: human.name,
      });
      firstLedgerId ??= entry.id;
    }
    recordAcceptance({
      humanId: human.id,
      agentIds: persona.agentIds,
      at: Date.now(),
      ledgerId: firstLedgerId ?? 0,
      deputyOf: persona.deputyOf,
    });
    toast.success("Accountability accepted - written to the audit ledger ✓", {
      description: `accountability.accepted · ${persona.agentIds.join(", ")} · ledger #${firstLedgerId} · actor ${human.name}`,
    });
    leaveTimer.current = setTimeout(() => navigate({ to: "/" }), 1400);
  }

  /* ---------------- expired invite (error state) ---------------- */
  if (inviteExpired) {
    return (
      <Shell>
        <div className="glass-panel p-8 text-center space-y-4 mt-10">
          <div className="size-11 mx-auto rounded-md bg-status-error/10 border border-status-error/40 grid place-items-center text-status-error">
            <MailX className="size-5" />
          </div>
          <div className="text-sm font-semibold">
            This invite link has expired - ask your Pod Admin to re-send it.
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Invite links are one-time and short-lived on purpose: acceptance has to be attributable
            to the person it was issued to.
          </p>
          <button
            type="button"
            onClick={() =>
              toast.success("Pod Admin notified", {
                description: "A re-send request was sent for this invite.",
              })
            }
            className="h-8 px-3 rounded-md border border-border bg-white/5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Request a new invite
          </button>
        </div>
        <DemoVariantFooter />
      </Shell>
    );
  }

  /* ---------------- already accepted (collapsed) ---------------- */
  if (acceptance) {
    return (
      <Shell>
        <Header humanName={human.name} humanRole={human.role} />
        <div className="glass-panel p-4 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-status-done shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-status-done">
              Accepted ·{" "}
              {new Date(acceptance.at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · ledger #{acceptance.ledgerId}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Recorded as{" "}
              <span className="font-mono text-[11px]">accountability.accepted</span> on the audit
              ledger - coverage is accepted, not assigned.
            </div>
          </div>
          <Link
            to="/compliance"
            hash="audit"
            className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            View ledger →
          </Link>
        </div>
        <div className="space-y-3">
          {acceptance.agentIds.map((id) => (
            <CharterCard key={id} agentId={id} deputyOf={acceptance.deputyOf} />
          ))}
        </div>
        <DemoVariantFooter />
      </Shell>
    );
  }

  /* ---------------- fresh (invited, unaccepted) ---------------- */
  return (
    <Shell>
      <Header humanName={human.name} humanRole={human.role} />
      <ProgressDots stage={stage} />

      {/* stage 1 - charter */}
      <section className="space-y-2">
        <StageHead icon={ScrollText} n={1} title="Your charter" />
        <div className="space-y-3">
          {persona.agentIds.map((id) => (
            <CharterCard key={id} agentId={id} deputyOf={persona.deputyOf} />
          ))}
        </div>
        {!walkthroughOpened && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openWalkthrough}
              className="h-8 px-3 rounded-md border border-primary/50 bg-primary/15 text-primary text-[11px] font-semibold uppercase tracking-wider hover:bg-primary/25 transition-colors"
            >
              Continue - see how a gate review works
            </button>
          </div>
        )}
      </section>

      {/* stage 2 - first-gate walkthrough */}
      <section ref={walkthroughRef} className="space-y-2 scroll-mt-6">
        <StageHead icon={BookOpenCheck} n={2} title="Your first gate, guided" />
        <FirstGateWalkthrough
          opened={walkthroughOpened}
          onOpen={openWalkthrough}
          onComplete={completeWalkthrough}
        />
      </section>

      {/* stage 3 - accept */}
      <section ref={acceptRef} className="space-y-2 scroll-mt-6">
        <StageHead icon={Handshake} n={3} title="Accept accountability" />
        <AcceptAccountabilityPanel
          humanName={human.name}
          agentIds={persona.agentIds}
          deputyOf={persona.deputyOf}
          ready={walkthroughOpened}
          onAccept={accept}
        />
      </section>

      <DemoVariantFooter />
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl p-4 lg:px-6 lg:py-8 space-y-6">{children}</div>
    </div>
  );
}

function Header({ humanName, humanRole }: { humanName: string; humanRole: string }) {
  return (
    <div className="text-center space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        accountability handshake · {humanName} · {humanRole}
      </div>
      <h1 className="text-xl font-semibold tracking-tight">
        Welcome - you&apos;re the accountable human.
      </h1>
      <p className="text-xs text-muted-foreground">
        Coverage isn&apos;t assigned, it&apos;s accepted - and provable on the audit ledger.
      </p>
    </div>
  );
}

const STAGE_DOTS = [
  { n: 1 as const, label: "Charter" },
  { n: 2 as const, label: "Walkthrough" },
  { n: 3 as const, label: "Accept" },
];

function ProgressDots({ stage }: { stage: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-5">
      {STAGE_DOTS.map((d) => (
        <div key={d.n} className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full transition-colors",
              stage >= d.n ? "bg-primary text-primary" : "bg-border",
              stage === d.n && "glow-pulse",
            )}
          />
          <span
            className={cn(
              "text-[10px] font-mono uppercase tracking-wider transition-colors",
              stage >= d.n ? "text-foreground" : "text-muted-foreground/60",
            )}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function StageHead({
  icon: Icon,
  n,
  title,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  n: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        stage {n} · {title}
      </span>
    </div>
  );
}

/** Quiet demo affordance - the seeded invite states are search-param driven. */
function DemoVariantFooter() {
  return (
    <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-muted-foreground/60 pt-2">
      <span>demo variants:</span>
      <Link to="/welcome" search={{}} className="hover:text-foreground transition-colors">
        single
      </Link>
      <span>·</span>
      <Link
        to="/welcome"
        search={{ variant: "multi" }}
        className="hover:text-foreground transition-colors"
      >
        multi-agent
      </Link>
      <span>·</span>
      <Link
        to="/welcome"
        search={{ variant: "deputy" }}
        className="hover:text-foreground transition-colors"
      >
        deputy
      </Link>
      <span>·</span>
      <Link
        to="/welcome"
        search={{ invite: "expired" }}
        className="hover:text-foreground transition-colors"
      >
        expired invite
      </Link>
    </div>
  );
}
