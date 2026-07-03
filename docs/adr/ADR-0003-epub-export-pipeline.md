# ADR-0003: EPUB export pipeline

- **Status:** Accepted
- **Date:** 2026-07-03

## Keywords

`epub`, `export`, `kbp`, `zip`, `jszip`, `epub3`

## Context

OpenBook Author exports books as EPUB 3 packages and KBP zip bundles. Chapter HTML comes from the TipTap editor and must pass through transforms for widgets, guidebook blocks, KBP typography, and embedded assets.

## Decision

A **single export pipeline** in `src/lib/epub.ts` handles EPUB generation:

1. Chapter HTML from editor state
2. `transformWidgetsForEpub()` — popups, galleries, guidebook blocks, KBP callouts, scene breaks
3. `applyKbpToHtml()` when KBP profile is enabled (`src/lib/kbp.ts`)
4. Asset resolution via `getAssetByFilename()` — inline `assets/{filename}` references
5. JSZip assembly — `mimetype`, `META-INF`, `OEBPS/content.opf`, nav, chapter XHTML, CSS

EPUB packages use **version 3.3** (backward-compatible with 3.0 readers). Package metadata includes:

- Dublin Core fields (`dc:title`, `dc:creator`, etc.)
- Store listing extensions (ISBN, BISAC, keywords, series) via `buildStoreMetadataOpf()`
- **Schema.org accessibility metadata** (`schema:accessMode`, `schema:accessibilityFeature`, `schema:accessibilityHazard`, `schema:accessibilitySummary`, optional `schema:certifier` / `schema:certifierCredential`) derived from book structure with optional author overrides in `BookMetadata`

KBP-specific CSS (`KBP_CSS`) and guidebook block styles are co-located in `epub.ts` export stylesheet. Print preview uses parallel rules in `src/app/globals.css`.

## Consequences

### Positive

- One place to audit export behavior
- Transform order is explicit and testable
- KBP and standard EPUB share the same HTML source

### Negative

- `epub.ts` grows with each new block/widget type
- Export bugs require checking editor HTML, transforms, and CSS together

### Agent rules

- **Must** route export changes through `src/lib/epub.ts`
- **Must** verify editor → print preview → EPUB when touching transforms or export CSS
- **Must not** duplicate export transform logic in components or API routes
- **Must** keep EPUB 3.3 accessibility metadata backward-compatible — auto-derive defaults; optional `BookMetadata` overrides only replace or extend, never break existing exports

## Related code

- `src/lib/epub.ts`
- `src/lib/kbp.ts`
- `src/lib/asset-store.ts`
- `src/app/globals.css` (print preview parity)
