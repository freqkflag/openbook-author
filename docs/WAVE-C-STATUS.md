# Wave C Status

**Branch:** `main` · **As of:** July 2026

**Status:** ✅ **Complete** — 7/7 MVP items shipped.

| # | Item | Issue | Status | Evidence |
|---|------|-------|--------|----------|
| 1 | Fixed-layout canvas MVP | [#20](https://github.com/freqkflag/openbook-author/issues/20) | ✅ | ADR-0007, `FixedLayoutCanvas`, spread EPUB export |
| 2 | Media + Quiz widgets | [#17](https://github.com/freqkflag/openbook-author/issues/17), [#15](https://github.com/freqkflag/openbook-author/issues/15) | ✅ | `MediaWidget`, `QuizWidget`, EPUB transforms |
| 3 | WASM Typst PDF pilot | [#64](https://github.com/freqkflag/openbook-author/issues/64) | ✅ | `electron/typst-pdf.cjs` CLI compile hook |
| 4 | Yjs collab prototype | [#22](https://github.com/freqkflag/openbook-author/issues/22) | ✅ | ADR-0008, `yjs-chapter.ts`, `CollabPanel` |
| 5 | Plugin SDK preview | [#65](https://github.com/freqkflag/openbook-author/issues/65) | ✅ | ADR-0009, `docs/plugin-sdk.md`, `TimelineWidget` |
| 6 | Audiobook manifest export | [#66](https://github.com/freqkflag/openbook-author/issues/66) | ✅ | `audiobook-export.ts`, editor export button |
| 7 | Markdown authoring mode | [#67](https://github.com/freqkflag/openbook-author/issues/67) | ✅ | `markdown-roundtrip.ts`, editor toggle |

## ADRs added

- [ADR-0007](adr/ADR-0007-fixed-layout-canvas.md) — Fixed spread editor
- [ADR-0008](adr/ADR-0008-realtime-collaboration.md) — Yjs BroadcastChannel prototype
- [ADR-0009](adr/ADR-0009-plugin-marketplace-sdk.md) — Plugin SDK preview

## Tests

- `folder-io.test.ts`, `backup-sync.test.ts` (Wave B)
- `markdown-roundtrip.test.ts`, `audiobook-export.test.ts`, `wave-c-widgets.test.ts`
