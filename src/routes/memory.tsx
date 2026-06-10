/**
 * /memory — Pod Memory & Constitution (wave 2, P1-A2).
 * Mock experience only: real-mode users are redirected by mockOnlyBeforeLoad.
 * Absorbs the old /knowledge view as section 3 ("What it knows").
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { MemoryView } from "@/components/memory/MemoryView";

export const Route = createFileRoute("/memory")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Memory & Constitution · Agency OS" }] }),
  component: MemoryView,
});
