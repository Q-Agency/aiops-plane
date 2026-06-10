/**
 * ChainSvg (/pitch) — the artifact chain as one static inline SVG:
 * spec → design → uix-ui-spec → tasks → code → review → test → release,
 * with knowledge as a pod-wide peer below the rail (no pipeline edges).
 *
 * Labels mirror src/mock/chain.ts (CHAIN_ROLES[*].produces) but are
 * hard-coded: this is a document, not an app. Light-theme colors only.
 * Per-stage tones carry the fleet status truth (2026-06-10): spec (BA) and
 * knowledge operating today; design (SA) + code (Dev) under construction;
 * uix-ui-spec (UI/UX) + test (QA) in preparation; the rest staged/planned.
 */

type StageTone = "live" | "build" | "prep" | "neutral";

const STAGES: { label: string; tone: StageTone }[] = [
  { label: "spec", tone: "live" },
  { label: "design", tone: "build" },
  { label: "uix-ui-spec", tone: "prep" },
  { label: "tasks", tone: "neutral" },
  { label: "code", tone: "build" },
  { label: "review", tone: "neutral" },
  { label: "test", tone: "prep" },
  { label: "release", tone: "neutral" },
];

const TONE: Record<StageTone, { fill: string; stroke: string; text: string; dash?: string }> = {
  live: { fill: "#ecfdf5", stroke: "#059669", text: "#065f46" },
  build: { fill: "#fffbeb", stroke: "#d97706", text: "#92400e" },
  prep: { fill: "#ffffff", stroke: "#94a3b8", text: "#475569", dash: "4 3" },
  neutral: { fill: "#ffffff", stroke: "#cbd5e1", text: "#334155" },
};

const NODE_W = 92;
const NODE_H = 36;
const GAP = 16;
const X0 = 6;
const Y = 30;
const RAIL_W = 8 * NODE_W + 7 * GAP;

const LEGEND: { tone: StageTone; label: string }[] = [
  { tone: "live", label: "operating today" },
  { tone: "build", label: "under construction" },
  { tone: "prep", label: "in preparation" },
  { tone: "neutral", label: "staged in the demo" },
];

export function ChainSvg() {
  return (
    <svg
      viewBox="0 0 860 178"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="The artifact chain: spec, design, uix-ui-spec, tasks, code, review, test, release — with knowledge as a pod-wide peer. Spec and knowledge operate today; design and code are under construction; uix-ui-spec and test are in preparation."
      className="h-auto w-full min-w-[640px]"
    >
      {/* "live today" tag over the spec node */}
      <text
        x={X0 + NODE_W / 2}
        y={18}
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="9.5"
        letterSpacing="1.5"
        fill="#047857"
      >
        LIVE TODAY
      </text>

      {STAGES.map((stage, i) => {
        const x = X0 + i * (NODE_W + GAP);
        const tone = TONE[stage.tone];
        return (
          <g key={stage.label}>
            <rect
              x={x}
              y={Y}
              width={NODE_W}
              height={NODE_H}
              rx={9}
              fill={tone.fill}
              stroke={tone.stroke}
              strokeWidth={stage.tone === "live" ? 1.5 : 1}
              strokeDasharray={tone.dash}
            />
            <text
              x={x + NODE_W / 2}
              y={Y + NODE_H / 2 + 4}
              textAnchor="middle"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="11.5"
              fill={tone.text}
            >
              {stage.label}
            </text>
            {/* arrow to the next stage */}
            {i < STAGES.length - 1 && (
              <g>
                <line
                  x1={x + NODE_W + 2}
                  y1={Y + NODE_H / 2}
                  x2={x + NODE_W + GAP - 7}
                  y2={Y + NODE_H / 2}
                  stroke="#94a3b8"
                  strokeWidth={1.25}
                />
                <polygon
                  points={`${x + NODE_W + GAP - 7},${Y + NODE_H / 2 - 3.5} ${x + NODE_W + GAP - 2},${Y + NODE_H / 2} ${x + NODE_W + GAP - 7},${Y + NODE_H / 2 + 3.5}`}
                  fill="#94a3b8"
                />
              </g>
            )}
          </g>
        );
      })}

      {/* knowledge — pod-wide peer, deliberately off the rail (no edges); operating today */}
      <rect
        x={X0}
        y={102}
        width={RAIL_W}
        height={34}
        rx={9}
        fill="#ecfdf5"
        stroke="#059669"
        strokeWidth={1.25}
        strokeDasharray="5 4"
      />
      <text
        x={X0 + RAIL_W / 2}
        y={123}
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="11.5"
        fill="#065f46"
      >
        knowledge · pod-wide shared context — operating today
      </text>

      {/* legend */}
      {LEGEND.map((item, i) => {
        const lx = X0 + i * 200;
        const tone = TONE[item.tone];
        return (
          <g key={item.tone}>
            <rect
              x={lx}
              y={154}
              width={14}
              height={14}
              rx={4}
              fill={tone.fill}
              stroke={tone.stroke}
              strokeWidth={1}
              strokeDasharray={tone.dash}
            />
            <text
              x={lx + 20}
              y={165}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="10.5"
              fill="#475569"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
