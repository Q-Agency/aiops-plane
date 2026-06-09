/**
 * Step registry for the FIRE UP wizard. WizardShell renders chrome
 * (header, stepper, footer); each step Component renders BODY ONLY
 * and reads/writes the draft via usePods().
 */

import type { ComponentType } from "react";
import type { WizardStepId } from "@/lib/pods/pod-store";
import { StepBlueprint } from "./StepBlueprint";
import { StepAgents } from "./StepAgents";
import { StepConnect } from "./StepConnect";
import { StepPeople } from "./StepPeople";
import { StepSlack } from "./StepSlack";
import { StepGoLive } from "./StepGoLive";

export type { WizardStepId };

export interface StepDef {
  id: WizardStepId;
  /** Stepper breadcrumb label (canonical: Blueprint · Agents · Connect · People · Slack · Go live). */
  label: string;
  /** Step title rendered by the WizardShell header. */
  title: string;
  /** One-line subtitle under the title. */
  sub: string;
  /** Footer primary CTA label while this step is active. */
  nextLabel: string;
  /** Body-only step component (no props — state via usePods()). */
  Component: ComponentType;
}

export const STEPS: StepDef[] = [
  {
    id: "blueprint",
    label: "Blueprint",
    title: "Choose a pod blueprint",
    sub: "Pick a proven shape and adjust later — nothing here is locked in.",
    nextLabel: "Next: Choose agents",
    Component: StepBlueprint,
  },
  {
    id: "agents",
    label: "Agents",
    title: "Choose your agents",
    sub: "Your curated Q delivery team — add what this pod needs.",
    nextLabel: "Next: Connect tools",
    Component: StepAgents,
  },
  {
    id: "connect",
    label: "Connect",
    title: "Connect your tools",
    sub: "Wire the pod into the tools your team already uses — your board stays the source of truth.",
    nextLabel: "Next: People",
    Component: StepConnect,
  },
  {
    id: "people",
    label: "People",
    title: "Who's accountable?",
    sub: "Assign one human per agent. An empty column is an uncovered risk — every agent needs an owner before launch.",
    nextLabel: "Next: Wire Slack",
    Component: StepPeople,
  },
  {
    id: "slack",
    label: "Slack",
    title: "Wire Slack",
    sub: "Tell the pod where to talk. Route each event to a channel, and pick where approvals get actioned.",
    nextLabel: "Next: Go live",
    Component: StepSlack,
  },
  {
    id: "golive",
    label: "Go live",
    title: "Readiness",
    sub: "Step 6 of 6 — confirm the pod is ready, then go live.",
    nextLabel: "Launch pod",
    Component: StepGoLive,
  },
];

export function stepIndex(id: WizardStepId): number {
  return STEPS.findIndex((s) => s.id === id);
}
