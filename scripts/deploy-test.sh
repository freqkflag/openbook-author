#!/usr/bin/env bash
set -euo pipefail

# Build, run, and smoke-test the production Docker image locally or on CI.
# Requires: docker CLI + daemon, curl, Node/npm (for npx wait-on).

IMAGE="openbook-author:deploy-test"
CONTAINER_ID=""

cleanup() {
  if [[ -n "${CONTAINER_ID}" ]]; then
    docker rm -f "${CONTAINER_ID}" >/dev/null 2>&1 || true
  fi
}

if [[ "${SKIP_DEPLOY_TEST:-}" == "1" ]]; then
  echo "SKIP_DEPLOY_TEST=1 — skipping Docker deploy test"
  exit 0
fi

trap cleanup EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker CLI not found" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "error: docker daemon not available" >&2
  exit 1
fi

echo "Building ${IMAGE}..."
docker build -t "${IMAGE}" .

echo "Starting container..."
if [[ -f /.dockerenv ]]; then
  # Forgejo/act job containers mount docker.sock but run in their own network
  # namespace. Published ports bind on the host, so 127.0.0.1:<port> never reaches
  # the smoke container — use its bridge IP instead.
  CONTAINER_ID=$(docker run -d "${IMAGE}")
  CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${CONTAINER_ID}")
  if [[ -z "${CONTAINER_IP}" ]]; then
    echo "error: could not resolve container IP" >&2
    exit 1
  fi
  BASE_URL="http://${CONTAINER_IP}:3000"
else
  CONTAINER_ID=$(docker run -d -p 0:3000 "${IMAGE}")
  PORT=$(docker port "${CONTAINER_ID}" 3000 | head -n1 | cut -d: -f2)
  BASE_URL="http://127.0.0.1:${PORT}"
fi

echo "Waiting for ${BASE_URL} (timeout 120s)..."
npx wait-on -t 120000 "${BASE_URL}"

echo "Running smoke checks..."
curl -fsS "${BASE_URL}/" >/dev/null
curl -fsS "${BASE_URL}/manifest.webmanifest" >/dev/null
curl -fsS "${BASE_URL}/sw.js" >/dev/null
curl -fsS "${BASE_URL}/api/ai/ollama-health" >/dev/null

echo "Docker deploy test passed (${BASE_URL})"
