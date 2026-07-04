#!/usr/bin/env bash
# Regression guard for nested-docker CI (Forgejo act_runner + docker.sock).
# Run: bash scripts/deploy-test.test.sh
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/deploy-test.sh"

grep -q '/.dockerenv' "${SCRIPT}" || {
  echo "deploy-test.sh must branch on /.dockerenv for nested Docker CI" >&2
  exit 1
}

grep -q 'JOB_NETWORK' "${SCRIPT}" || {
  echo "deploy-test.sh must attach smoke container to job network in nested Docker mode" >&2
  exit 1
}

grep -q '\-p 0:3000' "${SCRIPT}" || {
  echo "deploy-test.sh must publish ports for bare-host (Docker Desktop) mode" >&2
  exit 1
}

echo "deploy-test regression checks passed"
