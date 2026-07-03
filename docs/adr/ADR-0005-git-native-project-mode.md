# ADR-0005: Git-native project mode

- **Status:** Accepted
- **Date:** 2026-07-03
- **Issue:** _TBD — `feat: Git-friendly project folder mode with save-to-directory` (COMPETITIVE_AUDIT §9 #16)_

## Keywords

`git`, `folder`, `openbook`, `electron`, `storage`, `diff`, `version-control`

## Context

Today OpenBook Author persists books in two layers:

1. **Runtime cache** — full `Book[]` in browser `localStorage` (`src/lib/storage.ts`) plus asset blobs in memory (`src/lib/asset-store.ts`).
2. **Portable package** — a single `.openbook` zip (`manifest.json`, pretty-printed `book.json`, `assets/*`) built by `src/lib/package-io.ts` and written via Electron `window.openBook.writePackage` or browser download.

The `.openbook` zip is convenient for share/import but **opaque to git**: binary zip diffs are useless, and authors who want chapter-level history must export manually. Competitors offer no git-native book workflow; this is a FOSS moat ([COMPETITIVE_AUDIT.md](../COMPETITIVE_AUDIT.md) Wave B item 3).

Authors also expect Scrivener-style **project folders** on disk (especially in Electron) where external tools (git, ripgrep, backup) can operate on manuscript files.

## Decision

Introduce an optional **Git-native project mode** alongside the existing **package mode**. Both modes share the same canonical book schema (`src/types/book.ts`); only the on-disk layout and save path differ.

### Storage models

| Mode | On-disk layout | Primary use | Git-friendly |
|------|----------------|-------------|--------------|
| **Package mode** (default, unchanged) | Single `{slug}.openbook` zip | Share, import, quick backup | No |
| **Folder mode** (new, opt-in) | Directory with extracted layout | Version control, diff review, CI | Yes |

**Folder mode layout** (version `1.0`, mirrors zip internals):

```
my-book/
  manifest.json          # same schema as zip root
  book.json                # pretty-printed, stable key order where feasible
  assets/
    cover.jpg
    figure-01.png
  .openbook-project.json   # editor metadata only (not exported in zip)
```

`.openbook-project.json` holds **non-manuscript** state: last-opened chapter, UI prefs, optional linked git remote hint. It is listed in `.gitignore` template docs as optional (teams may commit it for shared UI defaults).

### Save behavior

- **Folder mode saves write files in place** — update `book.json` and touched assets only; avoid rewriting unchanged asset bytes.
- **Pretty-printed JSON** with 2-space indent (already used in `buildPackageZip`) so line diffs remain readable.
- **Stable ordering** — serialize chapters by `order`, assets by `filename`; document that reordering produces larger diffs (acceptable).
- **Package mode unchanged** — `buildPackageZip` remains the interchange format; folder → zip export always available.

### Open / create flows

| Action | Package mode | Folder mode |
|--------|--------------|-------------|
| Open | `.openbook` file (existing) | **Open Folder…** — validate `manifest.json` + `book.json` |
| New book | Create in localStorage; Save As `.openbook` | **New Folder Project…** — scaffold directory |
| Electron | `openDialog` / `saveDialog` on zip | New `openFolderDialog` / `saveFolderDialog` IPC |

Web: folder mode limited to **[File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)** where supported; otherwise Electron-only for v1.

### Electron Git panel (optional UI)

A **Git panel** in the Electron shell (not web v1) provides:

- Repository init / detect existing `.git`
- Status summary (modified `book.json`, asset paths)
- Open diff for `book.json` in system diff tool or embedded Monaco diff (implementation choice deferred)
- Stage/commit with message (thin wrapper around `isomorphic-git` or shell `git` — **prefer `isomorphic-git`** to avoid macOS Xcode CLI dependency)

The panel is **assistive**, not required: authors may use Terminal, GitHub Desktop, or IDE git instead.

### Options considered

| Option | Outcome |
|--------|---------|
| **A. Folder mode only** | Rejected — breaks share-by-email `.openbook` workflow |
| **B. Git hooks inside app** | Rejected — scope creep; external git suffices |
| **C. Per-chapter JSON files** | Deferred — larger refactor of book model; folder mode v1 keeps single `book.json` for parity with zip |
| **D. Dual mode (chosen)** | Package for interchange; folder for VC; explicit project `storageMode` flag |

### Book model addition

Add to `Book` (or `.openbook-project.json`):

```typescript
storageMode?: "package" | "folder";
projectPath?: string;   // directory for folder mode
packagePath?: string;   // file path for package mode (existing)
```

Only one primary path is active per open book.

## Consequences

### Positive

- Meaningful `git diff` / `git log` on manuscripts without proprietary snapshot tools
- Aligns with local-first FOSS positioning
- Folder layout matches zip internals — round-trip is straightforward
- External tooling (backup, grep, LLM batch scripts) can read `book.json` directly

### Negative / tradeoffs

- Two save code paths to maintain (`package-io.ts` + new `folder-io.ts`)
- Large single `book.json` diffs when many chapters change (mitigate later with per-chapter files — Wave C+)
- Binary assets still diff poorly; document `git lfs` for image-heavy books
- File System Access API fragmentation on web
- Git panel adds Electron dependency surface (`isomorphic-git` bundle size)

### Agent rules

- **Must** keep `.openbook` zip as the **interchange** format (import/export/dashboard)
- **Must** implement folder I/O in a dedicated module (e.g. `src/lib/folder-io.ts`); do not fork logic inside components
- **Must** route package assembly through existing `buildPackageZip` / `parsePackageFile` for zip operations
- **Must not** auto-init git repos without explicit user action
- **Must not** change default save behavior for existing users (package mode remains default)
- **Must** consult this ADR before adding `storageMode`, folder dialogs, or Git UI

## Related code

- `src/lib/package-io.ts` — zip build/parse (reference layout)
- `src/lib/storage.ts` — localStorage cache (unchanged role)
- `src/store/book-store.ts` — `saveBookToDisk`, `openBookFromDisk`
- `src/types/electron.d.ts` — extend with folder IPC
- Electron main process (package save/open today)

## Supersedes

None

## Related ADRs

- [ADR-0003](ADR-0003-epub-export-pipeline.md) — export unaffected; reads in-memory `Book`
- [ADR-0006](ADR-0006-self-hosted-sync.md) — backup target may be folder or zip
