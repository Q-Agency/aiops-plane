/**
 * PersonAvatar - the at-a-glance "who is this" chip. Renders a real-looking
 * portrait (humans.ts `avatarUrl`) with the person's initials as the offline
 * fallback, tinted/ringed by their primary-agent color. Use it wherever a
 * person's name appears so the reader recognizes a face, not just text.
 *
 * SSR-safe: a plain <img> + a client-only onError fallback to initials.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Human } from "@/mock/humans";

const SIZE = {
  xs: "size-5 text-[8px]",
  sm: "size-6 text-[9px]",
  md: "size-8 text-[11px]",
  lg: "size-10 text-sm",
} as const;

export function PersonAvatar({
  name,
  initials,
  src,
  agentId,
  color: colorProp,
  size = "sm",
  ring = true,
  className,
}: {
  name: string;
  initials: string;
  src?: string;
  /** Primary-agent id - drives the fallback tint + ring color. */
  agentId?: string;
  /** Explicit css color override (wins over agentId). */
  color?: string;
  size?: keyof typeof SIZE;
  ring?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const color = colorProp ?? (agentId ? `var(--agent-${agentId})` : "var(--muted-foreground)");
  const showImg = Boolean(src) && !failed;
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-mono font-semibold uppercase tracking-tight",
        SIZE[size],
        className,
      )}
      style={{
        color,
        borderColor: ring ? `color-mix(in oklab, ${color} 55%, transparent)` : "transparent",
        background: showImg ? "var(--muted)" : `color-mix(in oklab, ${color} 14%, transparent)`,
      }}
    >
      {showImg ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

/** Convenience: render straight from a humans.ts record. */
export function HumanAvatar({
  human,
  size = "sm",
  ring = true,
  className,
}: {
  human: Human;
  size?: keyof typeof SIZE;
  ring?: boolean;
  className?: string;
}) {
  return (
    <PersonAvatar
      name={human.name}
      initials={human.initials}
      src={human.avatarUrl}
      agentId={human.primaryAgentId}
      size={size}
      ring={ring}
      className={className}
    />
  );
}
