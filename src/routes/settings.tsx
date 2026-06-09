import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/settings/SettingsView";
import { getAuditStatusFn, type AuditStatus } from "@/lib/api/fleet.functions";

export const Route = createFileRoute("/settings")({
  loader: async () => {
    const audit = (await getAuditStatusFn().catch(() => null)) as AuditStatus | null;
    return { audit };
  },
  component: SettingsRoute,
});

function SettingsRoute() {
  const { audit } = Route.useLoaderData();
  return <SettingsView initial={audit} />;
}
