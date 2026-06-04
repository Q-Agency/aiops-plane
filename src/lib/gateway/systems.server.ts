import process from "node:process";

// Server-only registry of agentic systems (the "system registry").
//
// For now: hand-maintained config, one entry per agent, URL + key from env
// (secrets never hard-coded, never shipped to the client). The `.server.ts`
// suffix keeps this out of the client bundle. In v2 this moves to the
// control-plane DB with an "Add agent" UI (see docs/architecture.md §3c).

export type RegisteredSystem = {
  /** matches the agent card's `x-agency.id` */
  id: string;
  /** display fallback until the agent card is fetched */
  label: string;
  /** agent base URL, no trailing slash */
  baseUrl: string;
  /** optional bearer/api key, sent via `authHeader` */
  apiKey?: string;
  /** header name for the key; defaults to "X-API-Key" */
  authHeader?: string;
};

export function getSystems(): RegisteredSystem[] {
  const systems: RegisteredSystem[] = [];

  // BA — system #1. Set BA_AGENT_URL (+ BA_AGENT_API_KEY if it enforces auth).
  const baUrl = process.env.BA_AGENT_URL;
  if (baUrl) {
    systems.push({
      id: "ba",
      label: "Business Analyst",
      baseUrl: baUrl.replace(/\/+$/, ""),
      apiKey: process.env.BA_AGENT_API_KEY,
      authHeader: process.env.BA_AGENT_AUTH_HEADER ?? "X-API-Key",
    });
  }

  return systems;
}

export function getSystem(id: string): RegisteredSystem | undefined {
  return getSystems().find((s) => s.id === id);
}
