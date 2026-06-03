#!/usr/bin/env bash
#
# Rebuild the image and (re)create the AI Ops Dashboard container.
# Removes any existing container of the same name and starts a fresh one
# on PORT (default 8555).
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
IMAGE_NAME="ai-ops-dashboard"
CONTAINER_NAME="ai-ops-dashboard"
PORT="${PORT:-8555}"

# Run from the script's own directory so it works no matter where it's called.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- Build ----------------------------------------------------------------
# (If the build fails the script stops here and the running container, if any,
#  is left untouched.)
echo "==> Building image '${IMAGE_NAME}'..."
docker build -t "${IMAGE_NAME}" .

# --- Remove existing container --------------------------------------------
if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "==> Removing existing container '${CONTAINER_NAME}'..."
  docker rm -f "${CONTAINER_NAME}"
fi

# --- Run new container ----------------------------------------------------
echo "==> Starting '${CONTAINER_NAME}' on port ${PORT}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${PORT}:8555" \
  "${IMAGE_NAME}"

echo ""
echo "==> Done. '${CONTAINER_NAME}' is running:"
docker ps --filter "name=${CONTAINER_NAME}"
echo ""
echo "    App:  http://localhost:${PORT}"
echo "    Logs: docker logs -f ${CONTAINER_NAME}"
