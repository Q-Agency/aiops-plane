# syntax=docker/dockerfile:1

# ---- Build stage --------------------------------------------------------
# Use bun to install deps and build (the repo is locked with bun.lock).
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# Build a standalone Node server.
# The Vite config defaults Nitro to a Cloudflare target; NITRO_PRESET forces
# a self-contained Node server output under .output/.
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build

# ---- Runtime stage ------------------------------------------------------
# Nitro's node-server output is self-contained (deps are bundled into
# dist/server), so the runtime only needs Node + the dist directory.
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8555
ENV HOST=0.0.0.0

COPY --from=build /app/dist ./dist

EXPOSE 8555
CMD ["node", "dist/server/index.mjs"]
