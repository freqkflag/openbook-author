#!/usr/bin/env bash
# Create the OpenBook Author repo on homelab Forgejo via API.
# Requires FORGEJO_URL and FORGEJO_TOKEN in the environment (.env.local).

set -euo pipefail

FORGEJO_URL="${FORGEJO_URL:-http://192.168.12.115:3000}"
FORGEJO_TOKEN="${FORGEJO_TOKEN:-}"
FORGEJO_OWNER="${FORGEJO_OWNER:-freqkflag}"
FORGEJO_REPO="${FORGEJO_REPO:-openbook-author}"

if [[ -z "${FORGEJO_TOKEN}" ]]; then
  echo "error: set FORGEJO_TOKEN (personal access token)" >&2
  exit 1
fi

FORGEJO_URL="${FORGEJO_URL%/}"

echo "Creating ${FORGEJO_OWNER}/${FORGEJO_REPO} on ${FORGEJO_URL}..."

response="$(curl -fsS -w "\n%{http_code}" -X POST "${FORGEJO_URL}/api/v1/user/repos" \
  -H "Authorization: token ${FORGEJO_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${FORGEJO_REPO}\",\"private\":false,\"auto_init\":false}")"

body="${response%$'\n'*}"
code="${response##*$'\n'}"

if [[ "${code}" == "201" ]]; then
  echo "Repository created: ${FORGEJO_URL}/${FORGEJO_OWNER}/${FORGEJO_REPO}.git"
elif [[ "${code}" == "409" ]]; then
  echo "Repository already exists: ${FORGEJO_URL}/${FORGEJO_OWNER}/${FORGEJO_REPO}"
else
  echo "error: API returned HTTP ${code}" >&2
  echo "${body}" >&2
  exit 1
fi
