/**
 * TicketJourneySvg (/pitch, Act II) - "one ticket's journey" as a static
 * three-lane SVG: the client's board (Jira/Teamwork) on top, the pod
 * (AI PodOps) in the middle, the channels (Slack · email) below.
 * Visualizes the tracker boundary ("the board is the doorbell; AI PodOps
 * is the house"), per-agent artifacts (SPEC.md belongs to the BA - every
 * agent ships its own), and proactive outbound comms (digests, preps,
 * weekly reports, escalations pushed to Slack/email). Light-theme,
 * hard-coded, print-safe - a document figure, not an app.
 */

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

function Lane({
  y,
  h,
  label,
  sub,
  fill,
  stroke,
}: {
  y: number;
  h: number;
  label: string;
  sub: string;
  fill: string;
  stroke: string;
}) {
  return (
    <g>
      <rect x={6} y={y} width={848} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={1} />
      <text x={18} y={y + 17} fontFamily={mono} fontSize="10" letterSpacing="1.2" fill="#475569" fontWeight={700}>
        {label}
      </text>
      <text x={18} y={y + 30} fontFamily={mono} fontSize="9" fill="#94a3b8">
        {sub}
      </text>
    </g>
  );
}

function Node({
  x,
  y,
  w,
  label,
  tone,
  artifact,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  tone: "live" | "neutral" | "gate" | "ledger";
  artifact?: string;
}) {
  const fills = {
    live: { fill: "#ecfdf5", stroke: "#059669", text: "#065f46" },
    neutral: { fill: "#ffffff", stroke: "#cbd5e1", text: "#334155" },
    gate: { fill: "#eef2ff", stroke: "#6366f1", text: "#3730a3" },
    ledger: { fill: "#f8fafc", stroke: "#94a3b8", text: "#475569" },
  }[tone];
  return (
    <g>
      <rect x={x} y={y} width={w} height={28} rx={8} fill={fills.fill} stroke={fills.stroke} strokeWidth={1.2} />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fontFamily={mono} fontSize="10.5" fill={fills.text}>
        {label}
      </text>
      {artifact && (
        <text x={x + w / 2} y={y + 42} textAnchor="middle" fontFamily={mono} fontSize="8.5" fill="#64748b">
          {artifact}
        </text>
      )}
    </g>
  );
}

/** Soft outbound chip - the proactive comms row in the channels lane. */
function OutChip({ x, w, label }: { x: number; w: number; label: string }) {
  return (
    <g>
      <rect x={x} y={394} width={w} height={22} rx={11} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
      <text x={x + w / 2} y={409} textAnchor="middle" fontFamily={mono} fontSize="9.5" fill="#475569">
        {label}
      </text>
    </g>
  );
}

function Flow({ d, label, lx, ly, color = "#6366f1" }: { d: string; label?: string; lx?: number; ly?: number; color?: string }) {
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} markerEnd="url(#tj-arrow)" />
      {label && lx !== undefined && ly !== undefined && (
        <text x={lx} y={ly} textAnchor="middle" fontFamily={mono} fontSize="9.5" fontWeight={700} fill={color}>
          {label}
        </text>
      )}
    </g>
  );
}

export function TicketJourneySvg() {
  return (
    <svg
      viewBox="0 0 860 436"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="One ticket's journey: a card dragged to Ready on the Jira/Teamwork board starts the pod; agents run inside AI PodOps, each producing its own artifact (the BA's SPEC.md, the SA's design, and so on) behind human gates; questions, approvals, daily digests, preparations, weekly reports, and escalations are pushed proactively to Slack and email; plain status and artifact links are written back to the board."
      className="h-auto w-full min-w-[640px]"
    >
      <defs>
        <marker id="tj-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill="context-stroke" />
        </marker>
      </defs>

      {/* ---- Lane 1: the client's board ---- */}
      <Lane y={10} h={96} label="JIRA / TEAMWORK" sub="your board - tickets live here" fill="#f8fafc" stroke="#cbd5e1" />
      <Node x={170} y={52} w={120} label="Backlog" tone="neutral" />
      <Node x={330} y={52} w={150} label="Ready · AM-142" tone="gate" />
      <Node x={640} y={52} w={180} label="Done ✓ + artifact links" tone="live" />
      <Flow d="M 292 66 L 326 66" color="#94a3b8" />
      <text x={405} y={44} textAnchor="middle" fontFamily={mono} fontSize="9.5" fontWeight={700} fill="#6366f1">
        the drag = the doorbell
      </text>

      {/* ---- Lane 2: the pod - each agent ships its OWN artifact ---- */}
      <Lane y={148} h={96} label="AI PODOPS" sub="the pod - agents, gates, ledger · each agent ships its own artifact" fill="#eef2ff" stroke="#c7d2fe" />
      <Node x={170} y={186} w={92} label="BA agent" tone="live" artifact="SPEC.md" />
      <Node x={294} y={186} w={108} label="gate ✓ Ana" tone="gate" />
      <Node x={434} y={186} w={92} label="SA agent" tone="neutral" artifact="ARCHITECTURE.md" />
      <Node x={558} y={186} w={56} label="⋯" tone="neutral" artifact="own artifact each" />
      <Node x={646} y={186} w={130} label="ledger #4812" tone="ledger" />
      <Flow d="M 264 200 L 290 200" color="#94a3b8" />
      <Flow d="M 404 200 L 430 200" color="#94a3b8" />
      <Flow d="M 528 200 L 554 200" color="#94a3b8" />
      <Flow d="M 616 200 L 642 200" color="#94a3b8" />

      {/* start signal: Ready -> BA */}
      <Flow d="M 405 82 C 405 130, 216 140, 216 182" label="start signal" lx={330} ly={140} color="#6366f1" />
      {/* write-back: ledger -> Done */}
      <Flow d="M 730 182 C 730 140, 730 130, 730 86" label="status + links back" lx={730} ly={140} color="#059669" />

      {/* ---- Lane 3: the channels ---- */}
      <Lane y={286} h={140} label="SLACK · EMAIL" sub="your channels - Slack first-class (Teams next); agents come to you" fill="#ffffff" stroke="#cbd5e1" />
      {/* conversation bubbles */}
      <g>
        <rect x={170} y={324} width={250} height={24} rx={12} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} />
        <text x={182} y={340} fontFamily={mono} fontSize="9.5" fill="#334155">
          BA: "Does search include dealers?"
        </text>
        <rect x={244} y={354} width={176} height={22} rx={11} fill="#ecfdf5" stroke="#059669" strokeWidth={1} />
        <text x={256} y={369} fontFamily={mono} fontSize="9.5" fill="#065f46">
          PM: "Yes - per the SOW."
        </text>
        <rect x={520} y={324} width={256} height={24} rx={12} fill="#eef2ff" stroke="#6366f1" strokeWidth={1} />
        <text x={532} y={340} fontFamily={mono} fontSize="9.5" fill="#3730a3">
          Gate: SPEC ready - Approve? ✓ done
        </text>
      </g>
      {/* agent asks down, answer flows up, gate ping down */}
      <Flow d="M 216 230 C 216 270, 216 285, 216 320" label="agents reach out" lx={300} ly={272} color="#6366f1" />
      <Flow d="M 348 354 C 348 310, 348 280, 348 248" label="answer flows back" lx={448} ly={272} color="#059669" />
      <Flow d="M 648 222 C 648 270, 648 285, 648 320" color="#6366f1" />

      {/* proactive outbound row - pushed on the pod's own schedule */}
      <text x={484} y={388} textAnchor="middle" fontFamily={mono} fontSize="9.5" fontWeight={700} fill="#6366f1">
        pushed proactively - on the pod's schedule, to Slack and email
      </text>
      <OutChip x={170} w={150} label="daily digest · 08:00" />
      <OutChip x={336} w={140} label="daily preparation" />
      <OutChip x={492} w={186} label="weekly report → email too" />
      <OutChip x={694} w={126} label="escalations ⚠" />

      {/* optional depth */}
      <rect x={690} y={252} width={164} height={22} rx={11} fill="#ffffff" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
      <text x={772} y={267} textAnchor="middle" fontFamily={mono} fontSize="9.5" fill="#475569">
        go deeper → dashboard
      </text>
    </svg>
  );
}
