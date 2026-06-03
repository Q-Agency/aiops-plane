// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Self-hosting: when NITRO_PRESET is set (the Docker build sets `node-server`),
// force-enable Nitro so `vite build` emits a self-contained server for that
// preset at dist/server/index.mjs. Without the env var, behavior is unchanged —
// Lovable's sandbox still auto-runs its default Cloudflare build.
const selfHostBuild = process.env.NITRO_PRESET
  ? { nitro: { preset: process.env.NITRO_PRESET } }
  : {};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...selfHostBuild,
});
