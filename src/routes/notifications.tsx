/**
 * /notifications (C6) - the full notification center: Inbox / Preferences /
 * Alert rules / Digests. Canonical URL per C1: reached from the TopBar bell
 * (popover footer + gear → ?tab=preferences) and deep links only - NO rail
 * item. View lives in src/components/notifications/NotificationsView.tsx.
 */

import { createFileRoute } from "@tanstack/react-router";
import { mockOnlyBeforeLoad } from "@/lib/experience";
import {
  NotificationsView,
  type NotificationsTab,
} from "@/components/notifications/NotificationsView";

const TABS: NotificationsTab[] = ["inbox", "preferences", "rules", "digests"];

export const Route = createFileRoute("/notifications")({
  beforeLoad: mockOnlyBeforeLoad,
  validateSearch: (search: Record<string, unknown>): { tab?: NotificationsTab } => {
    const tab = search.tab;
    return TABS.includes(tab as NotificationsTab) ? { tab: tab as NotificationsTab } : {};
  },
  head: () => ({ meta: [{ title: "Notifications · AI PodOps" }] }),
  component: NotificationsRoute,
});

function NotificationsRoute() {
  const { tab } = Route.useSearch();
  // keyed so a bell-gear deep link (?tab=preferences) re-mounts onto that tab
  return <NotificationsView key={tab ?? "inbox"} initialTab={tab ?? "inbox"} />;
}
