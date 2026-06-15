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
//
// AWS Amplify (NITRO_PRESET=aws-amplify): the Lovable config hard-defaults
// Nitro's output to dist/server, but Nitro's aws-amplify preset must emit into
// `.amplify-hosting/compute/default` (its writeAmplifyFiles hook writes the
// deploy-manifest + compute/default/server.js loader THERE). Lovable spreads
// user `output` last, so we restore the preset's expected layout — only for
// this preset; node-server/cloudflare builds are untouched.
const preset = process.env.NITRO_PRESET;
const selfHostBuild = preset
  ? {
      nitro: {
        preset,
        ...(preset === "aws-amplify"
          ? {
              output: {
                dir: ".amplify-hosting",
                serverDir: ".amplify-hosting/compute/default",
                publicDir: ".amplify-hosting/static",
              },
            }
          : {}),
      },
    }
  : {};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...selfHostBuild,
});
