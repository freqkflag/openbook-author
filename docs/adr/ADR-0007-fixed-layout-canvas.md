# ADR-0007: Fixed-layout canvas MVP

- **Status:** Accepted
- **Date:** 2026-07-03
- **Issue:** [#20](https://github.com/freqkflag/openbook-author/issues/20)

## Decision

Ship a **single-spread fixed-layout editor** for landscape books:

- Optional `fixedSpread` on `Chapter` — pixel canvas sized 1024×768 (default) with positioned text/image elements
- `FixedLayoutCanvas` component — add/move elements, export as absolute-position XHTML for EPUB pre-paginated spreads
- Landscape `layoutMode` continues to set OPF `rendition:layout=pre-paginated`; chapters with `fixedSpread` emit viewport-fixed XHTML

## Consequences

- MVP is one spread per chapter (no multi-page spreads yet)
- Reflowable TipTap content and fixed spread are mutually exclusive per chapter (`editorMode: "reflow" | "fixed"`)

## Related code

- `src/types/fixed-layout.ts`
- `src/components/FixedLayoutCanvas.tsx`
- `src/lib/epub.ts` — `buildFixedSpreadXhtml()`
