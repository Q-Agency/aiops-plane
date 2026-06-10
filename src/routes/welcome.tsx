/**
 * /welcome — Welcome & Accountability Handshake (wave 2, P1-O2).
 * Mock experience only: real-mode users are redirected by mockOnlyBeforeLoad.
 * Variants via search: ?variant=multi | deputy · ?invite=expired.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import { WelcomeFlow, type WelcomeVariant } from "@/components/welcome/WelcomeFlow";

interface WelcomeSearch {
  invite?: "expired";
  variant?: Exclude<WelcomeVariant, "single">;
}

export const Route = createFileRoute("/welcome")({
  beforeLoad: mockOnlyBeforeLoad,
  validateSearch: (search: Record<string, unknown>): WelcomeSearch => {
    const out: WelcomeSearch = {};
    if (search.invite === "expired") out.invite = "expired";
    if (search.variant === "multi" || search.variant === "deputy") out.variant = search.variant;
    return out;
  },
  head: () => ({ meta: [{ title: "Welcome · Agency OS" }] }),
  component: WelcomeRoute,
});

function WelcomeRoute() {
  const { invite, variant } = Route.useSearch();
  return <WelcomeFlow variant={variant ?? "single"} inviteExpired={invite === "expired"} />;
}
