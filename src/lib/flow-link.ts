// Build a per-run deep-observability link from an agent's advertised URL template
// (`x-agency.ui.runUrlTemplate` on its Agent Card — e.g. a Flow Observer).
//
// The template comes from the agent's *own* card (trusted, not from observed/user
// content), and we only substitute ids the dashboard already holds — so no untrusted
// data enters the URL. Both ids are URL-encoded, and we emit only http(s) links.

export function runObservabilityUrl(
  template: string | undefined,
  run: { id: string; work_item_id?: string },
): string | undefined {
  if (!template) return undefined;
  const workItemId = run.work_item_id ?? run.id;
  const url = template
    .replace(/\{work_item_id\}/g, encodeURIComponent(workItemId))
    .replace(/\{run_id\}/g, encodeURIComponent(run.id));
  return /^https?:\/\//i.test(url) ? url : undefined;
}
