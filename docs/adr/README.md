# Architecture Decision Records (ADR)

OpenBook Author agents consult this directory before proposing architectural changes.

## Index

| ID | Title | Status | Keywords |
|----|-------|--------|----------|
| [ADR-0001](ADR-0001-guidebook-block-model.md) | Guidebook block model | Accepted | guidebook, trail_stop, workshop, cheat_sheet, tiptap |
| [ADR-0002](ADR-0002-widget-plugin-api.md) | Widget plugin API | Accepted | popup, gallery, widget, tiptap |
| [ADR-0003](ADR-0003-epub-export-pipeline.md) | EPUB export pipeline | Accepted | epub, export, kbp, zip |
| [ADR-0004](ADR-0004-agent-handoff-contract.md) | Agent handoff contract | Accepted | agent, handoff, router, workflow |
| [ADR-0005](ADR-0005-git-native-project-mode.md) | Git-native project mode | Accepted | git, folder, electron, storage, diff |
| [ADR-0006](ADR-0006-self-hosted-sync.md) | Self-hosted sync and backup | Accepted | sync, backup, webdav, s3, conflict |
| [ADR-0007](ADR-0007-fixed-layout-canvas.md) | Fixed-layout canvas MVP | Accepted | fixed-layout, spread, epub |
| [ADR-0008](ADR-0008-realtime-collaboration.md) | Realtime collaboration (Yjs) | Accepted | yjs, collab, tiptap |
| [ADR-0009](ADR-0009-plugin-marketplace-sdk.md) | Plugin marketplace SDK preview | Accepted | plugin, widget, sdk |

## Conventions

- **Naming:** `ADR-NNNN-short-slug.md` (zero-padded number, kebab-case slug)
- **Status:** Proposed → Accepted → Deprecated / Superseded by ADR-XXXX
- **New ADRs:** Copy [template.md](template.md), assign next number, add row to this index

## How agents search

1. Read this index for keyword matches
2. Grep `docs/adr/` for issue terms (affected area, file paths, feature names)
3. Read full ADR files for any match before proposing solutions
4. If an **Accepted** ADR applies, follow it unless the issue explicitly proposes changing architecture
5. To supersede an ADR, include `adr_proposal` in the execution handoff (see `@handoff-contract`)

## Related paths

| ADR | Primary code |
|-----|--------------|
| 0001 | `src/types/guidebook.ts`, `src/lib/guidebook-seed.ts`, `src/components/extensions/GuidebookBlock.tsx` |
| 0002 | `src/components/extensions/PopupWidget.tsx`, `GalleryWidget.tsx` |
| 0003 | `src/lib/epub.ts`, `src/lib/kbp.ts` |
| 0004 | `.cursor/rules/handoff-contract.mdc`, `.cursor/rules/issue-router.mdc`, `docs/agent-router.md` |
| 0005 | `src/lib/folder-io.ts`, `src/store/book-store.ts`, `src/components/GitPanel.tsx`, `electron/main.cjs` |
| 0006 | `src/lib/backup-sync/`, `src/components/BackupSyncPanel.tsx`, `electron/backup.cjs` |
