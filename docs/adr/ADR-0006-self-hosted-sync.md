# ADR-0006: Self-hosted sync and backup

- **Status:** Accepted
- **Date:** 2026-07-03
- **Issue:** _TBD — self-hosted backup of `.openbook` (COMPETITIVE_AUDIT Wave B item 7)_

## Keywords

`sync`, `backup`, `webdav`, `s3`, `openbook`, `conflict`, `self-hosted`, `opt-in`

## Context

OpenBook Author is **local-first**: books live in browser storage and, in Electron, on disk as `.openbook` zip files ([ADR-0005](ADR-0005-git-native-project-mode.md) adds optional folder projects). Authors on multiple machines or those wanting off-site backup need a way to copy projects without Atticus-style proprietary cloud lock-in.

Docker self-host already ships for the web app ([WAVE-A-STATUS-COMPLETE.md](../WAVE-A-STATUS-COMPLETE.md)); **sync is not collab**. Wave C covers realtime Yjs collaboration with a separate ADR. Wave B scope is **optional backup/sync of the `.openbook` artifact** (or folder project) to user-controlled storage.

Requirements from [COMPETITIVE_AUDIT.md](../COMPETITIVE_AUDIT.md):

- FOSS-friendly, self-hosted backends (WebDAV, S3-compatible)
- Opt-in — default remains fully offline
- Clear conflict model when two devices upload different versions
- No mandatory account system in the core app

## Decision

Ship a **Backup & Sync** settings panel (Electron v1; web later if credentials storage is solved) with:

1. **One-way backup** (manual + scheduled) as the v1 minimum
2. **Two-way sync** as v1.1 behind the same ADR conflict rules
3. **Remote backends:** WebDAV and S3-compatible (MinIO, AWS S3, Backblaze B2, etc.)

### What gets synced

| Project storage | Upload artifact |
|-----------------|-----------------|
| Package mode | Entire `{slug}.openbook` zip |
| Folder mode (ADR-0005) | Zip on sync (`buildPackageZip`) **or** multipart upload of `book.json` + assets (implementation choice: **zip for v1** to one code path) |

Remote path pattern:

```
{prefix}/{bookId}/{iso8601}-{slug}.openbook     # backup history
{prefix}/{bookId}/latest.openbook               # sync pointer (v1.1)
```

`bookId` is the stable UUID in `book.json`, not the display title.

### Credentials

- Stored in **OS keychain** via Electron (`safeStorage` / `keytar` pattern) — never in `localStorage`
- Web deferred: no sync UI until a secure credential story exists (or user-pasted app tokens per session)

Environment variables for headless Docker backup scripts are out of Wave B app scope but may be documented separately.

### Conflict model

**Last-write-wins (LWW) with explicit user checkpoint** — not automatic merge of `book.json`.

| Scenario | Behavior |
|----------|----------|
| Local save, remote unchanged | Upload replaces `latest.openbook` |
| Remote newer than local `updatedAt` | Show **Sync conflict** dialog: Keep local / Take remote / Save both (remote renamed with timestamp) |
| Both changed since last sync | Same dialog; default **Save both** to avoid data loss |
| Scheduled backup | Never overwrite `latest` without sync enabled; append timestamped archive only |

**No CRDT / chapter merge in Wave B.** Authors resolve conflicts by picking a whole book version or keeping both copies. Realtime merge remains Wave C (Yjs ADR).

Sync metadata stored locally (Electron):

```typescript
interface SyncState {
  bookId: string;
  remoteEtag?: string;
  remoteUpdatedAt?: string;
  lastSyncedAt?: string;
  lastLocalUpdatedAt?: string;
}
```

Compare `book.updatedAt` (ISO string on `Book`) against remote metadata before upload/download.

### UX principles

- **Opt-in:** Settings → Backup & Sync → Enable (off by default)
- **Visible status:** idle / syncing / conflict / error (matches save badge pattern)
- **Manual “Backup now”** before enabling auto-sync
- **No background sync on web** until credentials are secure

### Backends

| Backend | Protocol | Notes |
|---------|----------|-------|
| WebDAV | PROPFIND, PUT, GET | Nextcloud, ownCloud, macOS WebDAV disk |
| S3-compatible | AWS SDK v3 `@aws-sdk/client-s3` | Path-style for MinIO; configurable endpoint |

Authentication: Basic (WebDAV), access key + secret (S3). OAuth for cloud providers deferred.

### Options considered

| Option | Outcome |
|--------|---------|
| **A. Built-in OpenBook server** | Rejected for Wave B — ops burden; Docker app ≠ sync server |
| **B. Realtime sync (Yjs)** | Wave C — different ADR |
| **C. Git remote as “sync”** | Complementary — ADR-0005 covers VC; not a backup substitute for non-technical users |
| **D. Backup + LWW sync (chosen)** | Matches local-first + self-hosted story |

## Consequences

### Positive

- Authors control data residency (NAS, Nextcloud, MinIO)
- No subscription cloud requirement
- Timestamped backups give recovery even when LWW mis-picks
- Same `.openbook` interchange format as email/import flows

### Negative / tradeoffs

- LWW can lose edits if user confirms wrong side — mitigated by “Save both” default on dual-change
- Large assets make zip upload slow — show progress; future delta sync out of scope
- Credential handling adds Electron-native code and security review
- Sync does not replace git history for textual diff (use ADR-0005 for that)

### Agent rules

- **Must** treat sync as **opt-in**; offline editing works with zero remote config
- **Must** store credentials only in OS secure storage (Electron), not localStorage or `book.json`
- **Must** use `book.updatedAt` + remote etag/timestamp for conflict detection
- **Must** offer **Save both** on conflict — never silent discard
- **Must not** implement CRDT/chapter merge under this ADR
- **Must not** block export or local save when remote is unreachable
- **Must** upload `.openbook` zip via existing `buildPackageZip` for v1

## Related code

- `src/lib/package-io.ts` — `buildPackageZip`, `parsePackageFile`
- `src/store/book-store.ts` — `updatedAt`, save flows
- `src/types/book.ts` — stable `book.id`
- New (future): `src/lib/backup-sync/` — WebDAV + S3 clients, conflict UI

## Supersedes

None

## Related ADRs

- [ADR-0005](ADR-0005-git-native-project-mode.md) — folder vs package paths
- [ADR-0003](ADR-0003-epub-export-pipeline.md) — export independent of backup
