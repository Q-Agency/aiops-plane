import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AgentCard } from "@/contract";

// Best-effort probe of an agent URL — runs server-side (no CORS) and tries the
// A2A agent card first, then /agent/health. Used by the /connections page to
// auto-discover an agent's id/name and show reachability.

export type ProbeResult = {
  reachable: boolean;
  hasCard: boolean;
  id?: string;
  name?: string;
  error?: string;
};

async function fetchT(url: string, headers: Record<string, string>, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export const probeAgentFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().min(1), apiKey: z.string().optional() }))
  .handler(async ({ data }): Promise<ProbeResult> => {
    const base = data.url.replace(/\/+$/, "");
    const headers: Record<string, string> = { accept: "application/json" };
    if (data.apiKey) headers["X-API-Key"] = data.apiKey;

    // 1) A2A agent card
    try {
      const res = await fetchT(`${base}/.well-known/agent-card.json`, headers);
      if (res.ok) {
        const card = (await res.json()) as AgentCard;
        return {
          reachable: true,
          hasCard: true,
          id: card?.["x-agency"]?.id,
          name: card?.name,
        };
      }
    } catch {
      /* fall through to health */
    }

    // 2) /agent/health
    try {
      const res = await fetchT(`${base}/agent/health`, headers);
      if (res.ok) {
        const h = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return {
          reachable: true,
          hasCard: false,
          name: typeof h.name === "string" ? h.name : undefined,
          id: typeof h.id === "string" ? h.id : undefined,
        };
      }
      return { reachable: false, hasCard: false, error: `HTTP ${res.status}` };
    } catch (e) {
      return {
        reachable: false,
        hasCard: false,
        error: e instanceof Error ? e.message : "unreachable",
      };
    }
  });
