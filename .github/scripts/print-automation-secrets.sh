#!/usr/bin/env bash
# Prints the GitHub Actions secrets checklist for OpenBook automations.
# Add each value at: https://github.com/freqkflag/openbook-author/settings/secrets/actions

set -euo pipefail

cat <<'EOF'
OpenBook Author — Cursor Automation Webhook Secrets
====================================================

After saving each automation in Cursor, copy its Webhook URL + Bearer token (crsr_…).

| Secret name                         | Automation              | Trigger label(s)                    |
|-------------------------------------|-------------------------|-------------------------------------|
| OPENBOOK_WEBHOOK_DISPATCH           | DISPATCH                | router-ready                        |
| OPENBOOK_WEBHOOK_DISPATCH_AUTH      | DISPATCH                | (Bearer token)                      |
| OPENBOOK_WEBHOOK_RESEARCH           | Research                | needs-research                      |
| OPENBOOK_WEBHOOK_RESEARCH_AUTH      | Research                | (Bearer token)                      |
| OPENBOOK_WEBHOOK_PROJECT            | Project                 | epic                                |
| OPENBOOK_WEBHOOK_PROJECT_AUTH       | Project                 | (Bearer token)                      |
| OPENBOOK_WEBHOOK_FEATURE            | Feature                 | ready-for-execution + agent:feature |
| OPENBOOK_WEBHOOK_FEATURE_AUTH       | Feature                 | (Bearer token)                      |
| OPENBOOK_WEBHOOK_BUG                | Bug                     | ready-for-execution + agent:bug     |
| OPENBOOK_WEBHOOK_BUG_AUTH           | Bug                     | (Bearer token)                      |
| OPENBOOK_WEBHOOK_DOCS               | Docs                    | ready-for-execution + agent:docs    |
| OPENBOOK_WEBHOOK_DOCS_AUTH          | Docs                    | (Bearer token)                      |
| OPENBOOK_WEBHOOK_REFACTOR           | Refactor                | ready-for-execution + agent:refactor|
| OPENBOOK_WEBHOOK_REFACTOR_AUTH      | Refactor                | (Bearer token)                      |
| OPENBOOK_WEBHOOK_TEST               | Test                    | ready-for-execution + agent:test    |
| OPENBOOK_WEBHOOK_TEST_AUTH          | Test                    | (Bearer token)                      |
| OPENBOOK_WEBHOOK_UI                 | UI/UX                   | ready-for-execution + agent:design  |
| OPENBOOK_WEBHOOK_UI_AUTH            | UI/UX                   | (Bearer token)                      |
| OPENBOOK_WEBHOOK_REVIEW             | Review                  | ready-for-review                    |
| OPENBOOK_WEBHOOK_REVIEW_AUTH        | Review                  | (Bearer token)                      |
| OPENBOOK_WEBHOOK_MERGE              | Merge                   | approved-for-merge                  |
| OPENBOOK_WEBHOOK_MERGE_AUTH         | Merge                   | (Bearer token)                      |
| OPENBOOK_WEBHOOK_AUTHOR             | Author                  | needs-human                         |
| OPENBOOK_WEBHOOK_AUTHOR_AUTH        | Author                  | (Bearer token)                      |

RELEASE uses a PR-merged trigger — no webhook secret needed.

Save order: DISPATCH → TEST (issue #28 is queued) → REVIEW → FEATURE → remaining agents.
EOF
