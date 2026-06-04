import process from "node:process";
import { getCookie } from "@tanstack/react-start/server";

// Server-only registry of agentic systems (the "system registry").
//
// Sources (merged): (1) env config, (2) a per-browser `aiops_systems` cookie
// managed by the throwaway /connections page. Env wins on id conflicts. Secrets
// never reach the client; the `.server.ts` suffix keeps this server-only.
// In v2 this moves to the control-plane DB. See docs/architecture.md §3c.

export type RegisteredSystem = {
  /** matches the agent card's `x-agency.id` */
  id: string;
  /** display fallback until the agent card is fetched */
  label: string;
  /** agent base URL, no trailing slash */
  baseUrl: string;
  apiKey?: string;
  /** header name for the key; defaults to "X-API-Key" */
  authHeader?: string;
  /** optional project scope (informational for now) */
  project?: string;
  source: "env" | "cookie";
};

const SYSTEMS_COOKIE = "aiops_systems";
const stripSlash = (u: string) => u.replace(/\/+$/, "");
const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
};

function envSystems(): RegisteredSystem[] {
  const out: RegisteredSystem[] = [];
  const baUrl = process.env.BA_AGENT_URL;
  if (baUrl) {
    out.push({
      id: "ba",
      label: "Business Analyst",
      baseUrl: stripSlash(baUrl),
      apiKey: process.env.BA_AGENT_API_KEY,
      authHeader: process.env.BA_AGENT_AUTH_HEADER ?? "X-API-Key",
      source: "env",
    });
  }
  return out;
}

function parseCookieValue(raw: string): unknown[] {
  for (const candidate of [raw, safeDecode(raw)]) {
    if (!candidate) continue;
    try {
      const v = JSON.parse(candidate);
      if (Array.isArray(v)) return v;
    } catch {
      /* try next */
    }
  }
  return [];
}

function cookieSystems(): RegisteredSystem[] {
  let raw: string | undefined;
  try {
    raw = getCookie(SYSTEMS_COOKIE);
  } catch {
    return []; // no request context
  }
  if (!raw) return [];
  return parseCookieValue(raw)
    .map((s): RegisteredSystem | null => {
      const o = s as Record<string, unknown>;
      const baseUrl = typeof o.baseUrl === "string" ? stripSlash(o.baseUrl) : "";
      if (!baseUrl) return null;
      const id = typeof o.id === "string" && o.id ? o.id : baseUrl;
      return {
        id,
        label: typeof o.label === "string" && o.label ? o.label : id,
        baseUrl,
        apiKey: typeof o.apiKey === "string" ? o.apiKey : undefined,
        authHeader: typeof o.authHeader === "string" ? o.authHeader : "X-API-Key",
        project: typeof o.project === "string" ? o.project : undefined,
        source: "cookie",
      };
    })
    .filter((x): x is RegisteredSystem => x !== null);
}

export function getSystems(): RegisteredSystem[] {
  const byId = new Map<string, RegisteredSystem>();
  for (const s of cookieSystems()) byId.set(s.id, s); // cookie first…
  for (const s of envSystems()) byId.set(s.id, s); // …env wins on conflict
  return [...byId.values()];
}

export function getSystem(id: string): RegisteredSystem | undefined {
  return getSystems().find((s) => s.id === id);
}
