# Agent router and handoff contract

OpenBook Author uses a **studio of Cursor agents** orchestrated by `@issue-router`. Agents do not share chat memory — they pass structured **YAML handoff blocks** defined in `.cursor/rules/handoff-contract.mdc`.

Architecture: [ADR-0004](adr/ADR-0004-agent-handoff-contract.md).

## Workflow

```
GitHub Issue
    ↓  (router-ready label → issue-router.yml comment)
@issue-router          ← triage only; never edits code
    ↓  Router Handoff YAML
Execution agent        ← feature, debug, docs, refactor, test, ui
    ↓  Execution Handoff YAML
@merge-manager-agent   ← wave conflict check (parallel batches)
    ↓  Merge coordination YAML
@review-agent
    ↓  Review Handoff YAML
@pr-creator-agent      ← opens PR when approved
```

**Phase 2 (planned):** Knowledge Agent slot between router and execution agents. Today, `relevant_adrs` from `@architecture-memory` provides interim context injection.

## Cursor rules

| Rule | Role |
|------|------|
| `.cursor/rules/issue-router.mdc` | Triage, classification, ownership orchestration, NEXT lines |
| `.cursor/rules/handoff-contract.mdc` | Shared YAML schema for all handoffs |
| `.cursor/rules/merge-manager-agent.mdc` | Wave conflict detection before review |
| `.cursor/rules/architecture-memory.mdc` | ADR keyword map; `relevant_adrs` population |
| `.cursor/rules/project-manager-agent.mdc` | Epic decomposition and wave planning |

Attach the rule with `@issue-router`, `@feature-agent`, `@docs-agent`, etc. when starting a chat turn.

## Classification and routing

| Classification | Agent |
|----------------|-------|
| `bug` | `@debug-agent` |
| `feature` | `@feature-agent` |
| `docs` | `@docs-agent` |
| `refactor` | `@refactor-agent` |
| `test` | `@test-agent` |
| `design` | `@ui-agent` |
| `unknown` + low confidence | Escalate to human (`agent: null`) |

### Confidence gates

| Score | Behavior |
|-------|----------|
| ≥ 0.75 | Route normally; `escalate: false` |
| 0.50–0.74 | Route with caution note in `recommendation` |
| < 0.50 | `escalate: true`, `agent: null` — output Router Handoff only; no downstream agents |

## Router Handoff schema

Produced by `@issue-router`; consumed by execution agents.

```yaml
issue: <number>
title: <string>
classification: bug | feature | docs | refactor | test | design | unknown
confidence: <0.00–1.00>
agent: debug-agent | feature-agent | docs-agent | refactor-agent | test-agent | ui-agent
priority: low | medium | high | critical
estimated_scope: small | medium | large | epic
escalate: true | false
recommendation: <string | null>
relevant_adrs: []   # full slugs, e.g. ADR-0001-guidebook-block-model
deliverables:
  - <item>
success_criteria:
  - <criterion>
context:
  labels: []
  linked_files: []
  summary: <1–3 sentences>
lane: product | quality | knowledge | infrastructure
merge_lane: product | infrastructure
ownership: []
parallel_group: null | <area-id>
parallel_safe: true | false
conflicts_with:
  - issue: <number> | task: <string>
    reason: <string>
wave: null | <wave-id>
queue_after: []
workflow:
  - <current-agent>
  - merge-manager-agent
  - review-agent
  - pr-creator-agent
```

### Orchestration principle

**Orchestrate by ownership, not issue number.** Do not ask “Can these issues run together?” Ask “Will these agents touch the same parts of the codebase?”

### Orchestration fields

| Field | Meaning |
|-------|---------|
| `merge_lane` | PR bucket: `product` or `infrastructure`. Cross-lane work only meets at Merge Manager. |
| `ownership` | Files/directories this task will likely touch. Primary key for overlap detection. |
| `parallel_group` | Semantic area (e.g. `editor`, `epub-import`, `docs`). Product-lane tasks in the same group serialize on file overlap. |
| `parallel_safe` | `true` if this task may start now. |
| `conflicts_with` | Other issues or PM subtasks sharing `ownership`. |
| `wave` | Batch wave id from `@project-manager-agent` (e.g. `wave-a`). |
| `queue_after` | Issue numbers or task ids that must complete first. |

### Permanent lanes

| Lane | Purpose | Typical agents |
|------|---------|----------------|
| **product** | Features, bugs, editor, export | feature, debug, review, merge |
| **quality** | Tests, accessibility, performance | test, ui, review |
| **knowledge** | Docs, ADRs, research | docs |
| **infrastructure** | Cursor rules, GitHub workflows | docs, project-manager, merge |

Agents within a lane coordinate. Agents across lanes only meet at `@merge-manager-agent`. Product never waits for infrastructure without an explicit dependency.

### Overlap signals

| Signal | Meaning |
|--------|---------|
| 🟢 Safe | Different `ownership` — run together |
| 🟡 Coordinate | Related scope, non-overlapping files — UI may propose while feature codes |
| 🔴 Queue | Same `ownership` file on product lane — serialize |

#### Estimating `ownership`

Build a deduplicated path list from:

1. **Issue body** — explicit paths, backticked filenames, component names
2. **`context.linked_files`** — expand directories to likely children
3. **Classification defaults** — e.g. bug + export → `src/lib/epub.ts`; editor feature → `RichEditor.tsx`
4. **Keyword → ADR map** (`@architecture-memory`)

Prefer specific file paths. When uncertain, **include the likely file** — overlap detection should err toward serialization.

#### Overlap rule

Compare each issue's `ownership` against every other issue in the batch plus in-flight routed issues in the same milestone.

**Conflict:** identical file path, or one path is a parent directory of another.

#### Setting orchestration fields

| Condition | Set |
|-----------|-----|
| No file overlap | `parallel_safe: true`, `conflicts_with: []`, `queue_after: []` |
| Overlap | `conflicts_with` entry per overlap with `reason` citing shared file(s) |
| Product-lane overlap | Lower issue number runs first; higher gets `parallel_safe: false`, `queue_after: [<lower>]` |
| In current wave | Same `wave` id |
| Queued | `wave: null` |

#### Batch NEXT output

```
ORCHESTRATION (by ownership)
🟢 PARALLEL (wave-a): #32, #26, #11
🔴 QUEUE: #13 until #11 — both touch RichEditor.tsx
```

Ready issues:

```
NEXT (#32): Attach @debug-agent and paste the handoff below.
WORKFLOW: debug-agent → @merge-manager-agent → @review-agent → @pr-creator-agent
```

Queued issues:

```
NEXT (#13): QUEUED — start after #11 completes. Attach @feature-agent when unblocked.
```

Single issue (no batch): default `parallel_safe: true`, empty conflicts/queue, `wave: null`.

## Execution Handoff

Produced by execution agents; consumed by `@review-agent`.

```yaml
issue: <number>
source_agent: <agent-id>
status: complete | blocked | needs_human
changes_summary: <what was done>
files_touched: []
deliverables_completed: []
success_criteria_met: []
adrs_consulted: []
architecture_change: true | false
adr_proposal: null
open_questions: []
next_agent: review-agent
```

## Review Handoff

Produced by `@review-agent`; routes back to execution agent or forward to PR creator.

```yaml
issue: <number>
source_agent: review-agent
verdict: approved | changes_requested | blocked
findings: []
security_flags: []
a11y_flags: []
adr_compliance: pass | adr_missing | adr_conflict
next_agent: <execution-agent-id> | pr-creator-agent
```

### Review routing

| Condition | `next_agent` |
|-----------|--------------|
| `needs_human` or empty `files_touched` (planning gate) | Original `source_agent` |
| `changes_requested` or `blocked` | Original `source_agent` |
| `status: complete`, tests pass, `verdict: approved` | `pr-creator-agent` |

### ADR compliance gate

When `architecture_change: true` in the execution handoff:

| Value | Meaning |
|-------|---------|
| `pass` | Accepted ADRs followed, or `adr_proposal` present for merge |
| `adr_missing` | Architectural change with no ADR coverage |
| `adr_conflict` | Contradicts Accepted ADR without supersede proposal |

## Studio CLI

The **Studio Orchestrator** CLI mirrors the Cursor `@issue-router` rules and produces YAML handoffs that execution agents consume. Install dependencies (`npm install`), then:

### Route an issue

```bash
npm run studio -- route \
  --title "Fix export crash on large guidebooks" \
  --body "Steps to reproduce: ..." \
  --issue 6
```

Prints Router Handoff YAML plus `NEXT:` and `WORKFLOW:` lines.

If [GitHub CLI](https://cli.github.com/) is installed and authenticated, fetch issue metadata automatically:

```bash
npm run studio -- route --issue 6
```

You can still override title/body with explicit flags.

### Get next agent from a handoff file

```bash
npm run studio -- next --file handoff.yaml
```

Reads a YAML handoff (fenced or raw) and prints the next agent instruction.

### Validate a handoff

```bash
npm run studio -- validate --file handoff.yaml
```

Exits `0` when valid, `1` with field errors when invalid.

### Library modules

| Module | Purpose |
|--------|---------|
| `src/studio/orchestrator/types.ts` | Handoff TypeScript types |
| `src/studio/orchestrator/parse-handoff.ts` | Parse and validate YAML handoffs |
| `src/studio/orchestrator/route-issue.ts` | Rule-based issue classification |
| `src/studio/orchestrator/workflow.ts` | State machine for next-agent routing |
| `src/studio/orchestrator/prompts.ts` | `NEXT:` / `WORKFLOW:` line generation |

## GitHub automation

| Path | Purpose |
|------|---------|
| `.github/ISSUE_TEMPLATE/feature.yml` | Structured feature form; applies `router-ready` |
| `.github/ISSUE_TEMPLATE/bug.yml` | Structured bug form; applies `router-ready` |
| `.github/workflows/issue-labeler.yml` | Keyword labels + `router-ready` signal |
| `.github/workflows/issue-router.yml` | Posts one deduped `@issue-router` comment per issue when `router-ready` is applied |

The router workflow comment includes issue number, title, labels, and body. It does **not** re-post if a router comment already exists (marker: `<!-- openbook-author:issue-router -->`). Editing the issue body after routing does not refresh the comment.

### GitHub automation flow

1. Author opens an issue via a structured template (`feature.yml`, `bug.yml`, etc.).
2. [`issue-labeler.yml`](../.github/workflows/issue-labeler.yml) applies keyword labels and the `router-ready` signal.
3. [`issue-router.yml`](../.github/workflows/issue-router.yml) posts one deduped `@issue-router` comment with copy-paste instructions for Cursor.
4. In Cursor, attach `@issue-router` (or run `npm run studio route`) to produce the Router Handoff.
5. Attach the routed execution agent (`@debug-agent`, `@feature-agent`, etc.) with the handoff YAML.
6. Execution agent completes work and emits an Execution Handoff → `@merge-manager-agent` (parallel batches) → `@review-agent`.
7. Review agent emits Review Handoff → `@pr-creator-agent` when approved.

## Batch routing example

Four issues: `#32`, `#26`, `#11` run in parallel; `#13` queues behind `#11` (shared editor files).

**#11** — in wave, notes conflict with queued `#13`:

```yaml
lane: product
ownership:
  - src/components/RichEditor.tsx
  - src/app/editor/[id]/page.tsx
parallel_group: editor
parallel_safe: true
conflicts_with:
  - issue: 13
    reason: Both modify RichEditor.tsx and src/app/editor/[id]/page.tsx
wave: wave-a
queue_after: []
```

**#13** — queued:

```yaml
lane: product
ownership:
  - src/components/ChapterSidebar.tsx
  - src/components/RichEditor.tsx
  - src/store/book-store.ts
  - src/app/editor/[id]/page.tsx
parallel_group: editor
parallel_safe: false
conflicts_with:
  - issue: 11
    reason: Both modify RichEditor.tsx and src/app/editor/[id]/page.tsx
wave: null
queue_after: [11]
```

Full handoffs for all four issues live in `.cursor/rules/issue-router.mdc` § Phase 1 batch example.

## Agent responsibilities (summary)

| Agent | Edits code? | Primary output |
|-------|-------------|----------------|
| `@issue-router` | Never | Router Handoff YAML |
| Execution agents | Yes (scoped) | Execution Handoff YAML |
| `@review-agent` | Never | Review Handoff YAML |
| `@merge-manager-agent` | Never | Merge coordination YAML |
| `@pr-creator-agent` | Never (git/gh only) | Pull request URL |
| `@project-manager-agent` | Never | Task breakdown + wave plan |

Execution agents **must** consult `relevant_adrs` and `@architecture-memory` before architectural changes. They **must not** skip review before PR creation.

## Related documentation

- [docs/adr/README.md](adr/README.md) — ADR index and keyword map
- [docs/adr/ADR-0004-agent-handoff-contract.md](adr/ADR-0004-agent-handoff-contract.md) — architecture decision
- `.cursor/rules/handoff-contract.mdc` — canonical schema (source of truth)
- `.cursor/rules/issue-router.mdc` — router behavior and examples (source of truth)
