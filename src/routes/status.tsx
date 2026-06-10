/**
 * /status — Platform Status (wave 2, Blind spot 5): component health,
 * 90-day uptime, and the honest degraded-mode story. Client-clean render.
 * Mock experience only: real-mode users are redirected by mockOnlyBeforeLoad.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { StatusView } from "@/components/status/StatusView";

export const Route = createFileRoute("/status")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Platform status · Agency OS" }] }),
  component: StatusView,
});
