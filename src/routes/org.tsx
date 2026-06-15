/**
 * /org - Org Portfolio Rollup (wave 2, P1-C2): every pod in the client org
 * on one page, plus the ExpansionHint cards.
 * Mock experience only: real-mode users are redirected by mockOnlyBeforeLoad.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { OrgView } from "@/components/org/OrgView";

export const Route = createFileRoute("/org")({
  beforeLoad: mockOnlyBeforeLoad,
  head: () => ({ meta: [{ title: "Your pods · Agency OS" }] }),
  component: OrgView,
});
