// Generate src/contract/types.gen.ts from the canonical agent-contract.schema.json.
//
// The JSON Schema is the single source of truth; the TS types are DERIVED, so they
// cannot drift from it. Run `bun run gen:contract` after editing the schema; CI runs
// `bun run gen:contract:check` to fail the build if the committed output is stale.
//
// Two post-steps json-schema-to-typescript can't do itself:
//   • the freeform `metadata` / `data` bags → `{ [k: string]: unknown }` (strict mode
//     would otherwise type them as `{}`, which blocks `metadata.foo` access);
//   • emit `SCHEMA_VERSION` from the schema's `x-contract-version`, so the runtime
//     constant is single-sourced too.
import { compileFromFile } from "json-schema-to-typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = join(ROOT, "src/contract/agent-contract.schema.json");
const OUT = join(ROOT, "src/contract/types.gen.ts");

const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));

let body = await compileFromFile(SCHEMA, {
  additionalProperties: false, // strict objects — catch typos in our own code
  bannerComment: "",
  unreachableDefinitions: true, // schema is all $defs, no root type → emit them all
  declareExternallyReferenced: true,
  style: { semi: true, singleQuote: false },
});

// Freeform bags stay indexable (strict mode renders them as `{}`).
body = body.replace(/\b(metadata|data)\?: \{\};/g, "$1?: { [k: string]: unknown };");

const header =
  "// GENERATED from agent-contract.schema.json by scripts/gen-contract.mjs — DO NOT EDIT.\n" +
  "// Run `bun run gen:contract` after changing the schema.\n\n";
const version = `\n/** The contract version this build targets (from the schema's x-contract-version). */\nexport const SCHEMA_VERSION = ${JSON.stringify(
  schema["x-contract-version"],
)} as const;\n`;
const out = header + body + version;

if (process.argv.includes("--check")) {
  const current = readFileSync(OUT, "utf8");
  if (current !== out) {
    console.error(
      "✗ src/contract/types.gen.ts is out of date with the schema.\n  Run: bun run gen:contract",
    );
    process.exit(1);
  }
  console.log("✓ types.gen.ts is in sync with the schema");
} else {
  writeFileSync(OUT, out);
  console.log("✓ wrote src/contract/types.gen.ts from the schema");
}
