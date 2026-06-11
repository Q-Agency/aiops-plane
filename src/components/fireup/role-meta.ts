/**
 * Tiny display helpers shared by the LAUNCH catalog surfaces
 * (StepBlueprint, StepAgents, PipelinePreview, AgentDetailDialog).
 * Chain facts stay in src/mock/chain.ts — this is presentation only.
 */

import type { ChainRoleId } from "@/mock/chain";

/** Short labels for chips / gap badges ("Needs: spec from BA", "+ Add Tasklist"). */
export const ROLE_SHORT: Record<ChainRoleId, string> = {
  ba: "BA",
  sa: "SA",
  uiux: "UI/UX",
  tasklist: "Tasklist",
  dev: "Dev",
  review: "Review",
  qa: "QA",
  devops: "DevOps",
  knowledge: "Knowledge",
};

/** color-mix shorthand for the neon glass accents, e.g. mix("var(--agent-ba)", 45). */
export function mix(color: string, pct: number): string {
  return `color-mix(in oklab, ${color} ${pct}%, transparent)`;
}
