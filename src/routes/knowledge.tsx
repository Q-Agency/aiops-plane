/**
 * /knowledge - ABSORBED by /memory in wave 2 (Memory & Rules owns the
 * knowledge surface now; the rail item was replaced). Kept as a pure
 * redirect so old links keep working: standard → /memory, real → /.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { isMock } from "@/lib/experience";

export const Route = createFileRoute("/knowledge")({
  beforeLoad: (ctx: { context: { user?: { dataMode?: string } | null } }) => {
    throw redirect({ to: isMock(ctx.context.user) ? "/memory" : "/" });
  },
});
