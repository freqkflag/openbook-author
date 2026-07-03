#!/usr/bin/env bash
# Runs on every cloud agent / automation boot after checkout.
set -euo pipefail

if ! command -v python >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  echo "python not on PATH; use python3 explicitly"
fi

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "OpenBook Author agent environment ready:"
echo "  node: $(node -v 2>/dev/null || echo missing)"
echo "  npm:  $(npm -v 2>/dev/null || echo missing)"
echo "  python: $(command -v python || echo missing)"
echo "  python3: $(command -v python3 || echo missing)"
echo "  gh: $(command -v gh || echo missing)"
