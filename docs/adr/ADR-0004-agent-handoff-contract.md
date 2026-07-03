# ADR-0004: Agent handoff contract

- **Status:** Accepted
- **Date:** 2026-07-03
- **Issue:** #31, #32, #33 (issue router pipeline)

## Keywords

`agent`, `handoff`, `router`, `workflow`, `cursor`, `github`

## Context

OpenBook Author uses a studio of specialized Cursor agents (router, feature, debug, review, etc.). Without a shared contract, each agent invents its own output format and downstream agents lose context between issues.

## Decision

All studio agents communicate via **YAML handoff blocks** defined in `.cursor/rules/handoff-contract.mdc`:

| Handoff | Producer | Consumer |
|---------|----------|----------|
| Router Handoff | `@issue-router` | Execution agents |
| Execution Handoff | Execution agents | `@review-agent` |
| Review Handoff | `@review-agent` | `@pr-creator-agent` |

GitHub intake is structured via:

- Issue forms (`feature.yml`, `bug.yml`) with `router-ready` label
- `issue-labeler.yml` — keyword labels + `router-ready` signal
- `issue-router.yml` — one deduped `@issue-router` comment per issue

Workflow: **Issue Router → Execution Agent → Review Agent → PR Creator** (Knowledge Agent slot reserved for Phase 2).

The PR Creator gate is explicit: `@pr-creator-agent` is a valid Review Handoff target only when `verdict: approved`. PR creation must use a conventional PR title/body, include `Closes #<issue>` and a `## Test plan`, and post the created PR link back on the issue.

## Consequences

### Positive

- Every agent receives the same issue context shape
- Router confidence gates prevent low-quality routing
- GitHub automation posts copy-paste prompts for Cursor

### Negative

- Handoff schema changes require updating all agent rules
- Skip-only router comments do not refresh when issue body changes

### Agent rules

- **Must** accept and produce handoffs per `@handoff-contract`
- **Must not** edit code from `@issue-router` (triage only)
- **Must not** skip review before PR creation
- **Must** consult `@architecture-memory` and `relevant_adrs` before architectural changes

## Related code

- `.cursor/rules/handoff-contract.mdc`
- `.cursor/rules/issue-router.mdc`
- `.github/workflows/issue-labeler.yml`
- `.github/workflows/issue-router.yml`
- `.github/ISSUE_TEMPLATE/`
