/**
 * /share/$token - Shared Report Viewer (wave 2, P1-H4): chrome-less,
 * client-clean render of a shared report for someone with no account.
 *
 * NO mock-only guard and NO auth - the token IS the auth. The root route's
 * beforeLoad skips the /login redirect for /share/* and returns a null user,
 * so the AppShell never wraps this page (see __root.tsx). Expired/revoked/
 * unknown tokens render calm cards that leak zero report data.
 */

import { createFileRoute } from "@tanstack/react-router";
import { ShareViewer } from "@/components/share/ShareViewer";

export const Route = createFileRoute("/share/$token")({
  head: () => ({ meta: [{ title: "Shared report · Agency OS" }] }),
  component: ShareTokenRoute,
});

function ShareTokenRoute() {
  const { token } = Route.useParams();
  return <ShareViewer token={token} />;
}
