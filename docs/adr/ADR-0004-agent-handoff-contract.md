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

`@project-manager-agent` produces a separate approval-gated subtask plan for `estimated_scope: epic` issues. That plan is committed under `.openbook/project/` and applied by GitHub Actions, but it is not a fourth execution handoff: child issue creation requires `approve_subtasks: true`.

GitHub intake is structured via:

- Issue forms (`feature.yml`, `bug.yml`) with `router-ready` label
- `issue-labeler.yml` — keyword labels + `router-ready` signal
- `issue-router.yml` — one deduped `@issue-router` comment per issue

Workflow: **Issue Router → Execution Agent → Review Agent → PR Creator** (Knowledge Agent slot reserved for Phase 2).

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
- `.cursor/rules/project-manager-agent.mdc`
- `.cursor/rules/issue-router.mdc`
- `.github/workflows/router-apply-project-pr.yml`
- `.github/workflows/issue-labeler.yml`
- `.github/workflows/issue-router.yml`
- `.github/ISSUE_TEMPLATE/`
