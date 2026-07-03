# Wave B Status

**Branch:** `main` · **As of:** July 2026  
**Sources:** [COMPETITIVE_AUDIT.md](COMPETITIVE_AUDIT.md) §5 Wave B, [FUTURE_FEATURES.md](FUTURE_FEATURES.md), [ADR index](adr/README.md)

**Goal:** Ship FOSS differentiation features paid tools can't or won't — IBA import depth, hierarchical TOC, git-native workflow, local AI (RAG + Ollama), EPUB 3.3 metadata, and optional self-hosted backup.

**Status:** ✅ **Complete** — all 7/7 items shipped.

| Phase | Scope | Status |
|-------|-------|--------|
| **Wave B kickoff** | Tracking doc + ADR-0005 (git-native) + ADR-0006 (self-hosted sync) | ✅ July 2026 |
| **Wave B.1** | IBA import depth ([#19](https://github.com/freqkflag/openbook-author/issues/19)) | ✅ Shipped July 2026 |
| **Wave B build** | Remaining competitive-audit items | ✅ Complete |

---

## Wave B checklist (7 items)

| # | Item | ADR | Issue | Status | Notes |
|---|------|-----|-------|--------|-------|
| 1 | **Deepen IBA import** | — | [#19](https://github.com/freqkflag/openbook-author/issues/19) | ✅ Shipped | `77eeca3` |
| 2 | **Hierarchical TOC / parts** | — | [#49](https://github.com/freqkflag/openbook-author/issues/49) | ✅ Shipped | `d7a633c` |
| 3 | **Git-for-books workflow** | [ADR-0005](adr/ADR-0005-git-native-project-mode.md) | [#59](https://github.com/freqkflag/openbook-author/issues/59) | ✅ Shipped | `folder-io.ts`, folder IPC, Git panel |
| 4 | **AI RAG + consistency agent** | — | [#60](https://github.com/freqkflag/openbook-author/issues/60) | ✅ Shipped | `8bdadf4` |
| 5 | **Expand Ollama** | — | [#61](https://github.com/freqkflag/openbook-author/issues/61) | ✅ Shipped | `94f6b29` |
| 6 | **EPUB 3.3 metadata upgrade** | — | [#62](https://github.com/freqkflag/openbook-author/issues/62) | ✅ Shipped | `7f80ea0` |
| 7 | **Self-hosted sync (optional)** | [ADR-0006](adr/ADR-0006-self-hosted-sync.md) | [#63](https://github.com/freqkflag/openbook-author/issues/63) | ✅ Shipped | WebDAV + S3 backup panel, OS keychain creds |

---

## Wave B.3 — Git-for-books ([#59](https://github.com/freqkflag/openbook-author/issues/59))

| Deliverable | Evidence |
|-------------|----------|
| ADR-0005 Accepted | Dual storage model: package (default) + folder (opt-in) |
| `src/lib/folder-io.ts` | Pretty-printed `book.json` + manifest; diff-friendly saves |
| Electron folder IPC | `openFolderDialog`, `createFolderDialog`, `writeFolderProject`, `readFolderProject` |
| Book store flows | `createFolderProject`, `openFolderProject`, folder auto-save |
| Git panel (Electron) | `GitPanel.tsx` — init, status, commit via `isomorphic-git` |
| Tests | `folder-io.test.ts` — round-trip, validation |

---

## Wave B.4 — Self-hosted backup ([#63](https://github.com/freqkflag/openbook-author/issues/63))

| Deliverable | Evidence |
|-------------|----------|
| ADR-0006 Accepted | Opt-in LWW backup; zip upload via `buildPackageZip` |
| `src/lib/backup-sync/` | WebDAV + S3-compatible clients |
| Credential storage | `electron/backup.cjs` — `safeStorage` encrypted config |
| Backup UI | `BackupSyncPanel.tsx` in Book Properties |
| Tests | `backup-sync.test.ts` — remote path builder |

---

## ADR gate

| Initiative | ADR | Status |
|------------|-----|--------|
| Git-native project folder mode | [ADR-0005](adr/ADR-0005-git-native-project-mode.md) | ✅ Accepted |
| Self-hosted backup / sync | [ADR-0006](adr/ADR-0006-self-hosted-sync.md) | ✅ Accepted |

---

## Exit criteria

Wave B is **done** — all checklist rows ✅, ADRs accepted, issues #59 and #63 ready to close.

Wave C tracking: [WAVE-C-STATUS.md](WAVE-C-STATUS.md)
