// The contract types the dashboard imports.
//
// These are GENERATED from the canonical `agent-contract.schema.json`
// (see `types.gen.ts` + `scripts/gen-contract.mjs`), so they cannot drift from the
// schema. This file is the stable import surface (`@/contract`); put any hand-written
// helpers here, layered on top of the generated shapes.
export * from "./types.gen";

import type { AgentEvent, AgentHealth, HITLGate, Run, Step } from "./types.gen";

// Named aliases for enums the schema declares inline on a property (json-schema-to-
// typescript emits those inline rather than as named exports). DERIVED from the
// generated interfaces, so they track the schema automatically — never hand-edited.
export type AgentState = AgentHealth["state"];
export type RunStatus = Run["status"];
export type RunOutcome = NonNullable<Run["outcome"]>;
export type HITLKind = HITLGate["kind"];
export type HITLState = HITLGate["state"];
export type StepKind = Step["kind"];
export type EventLevel = NonNullable<AgentEvent["level"]>;

/** ISO-8601 timestamp string (the schema types these as `string`/date-time). */
export type ISODateTime = string;
