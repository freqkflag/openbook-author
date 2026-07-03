#!/usr/bin/env bash
# Creates GitHub labels used by the OpenBook Author agent automation pipeline.
# Run once per repo: ./.github/scripts/setup-agent-labels.sh [owner/repo]

set -euo pipefail

REPO="${1:-freqkflag/openbook-author}"

labels=(
  "routed-dispatch|1d76db|Issue routed by DISPATCH"
  "agent:feature|a2eeef|Route to Feature agent"
  "agent:bug|d73a4a|Route to Bug agent"
  "agent:docs|0075ca|Route to Docs agent"
  "agent:test|0e8a16|Route to Test agent"
  "agent:design|d946ef|Route to UI/UX agent"
  "ready-for-execution|fbca04|Execution agent may start"
  "ready-for-review|5319e7|Awaiting Review agent"
  "approved-for-merge|0e8a16|Approved for PR merge"
  "needs-human|b60205|Human gate required"
  "needs-research|7057ff|ADR research required"
  "needs-rework|d93f0b|Review requested changes"
  "epic|8a5cff|Epic breakdown required"
  "agent-running|5319e7|Cloud agent slot in use (pipeline mutex)"
)

for entry in "${labels[@]}"; do
  IFS='|' read -r name color description <<< "$entry"
  if gh label create "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null; then
    echo "created: $name"
  else
    echo "exists:  $name"
  fi
done

echo "Done. Labels ready on $REPO"
