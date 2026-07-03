# ADR-0001: Guidebook block model

- **Status:** Accepted
- **Date:** 2026-07-03
- **Issue:** Guidebook block prototype (v0.2)

## Keywords

`guidebook`, `trail_stop`, `workshop`, `cheat_sheet`, `tiptap`, `kbp`

## Context

Guidebook template content needs structured blocks (trail stops, workshops, cheat sheets) — not generic HTML paragraphs. Blocks must edit in the rich editor, render in print preview, and export to EPUB with consistent styling.

## Decision

Guidebook content is modeled as **typed TipTap atom nodes** with three block types:

- `trail_stop` — waypoint with mile marker, elevation, amenities
- `workshop` — reflective exercises with short/long response hints
- `cheat_sheet` — label/value grid (2 or 3 columns)

Each node stores:

- `data-guidebook` — block type attribute
- `data-payload` — JSON-serialized typed payload

Payload types and normalization live in `src/types/guidebook.ts`. The editor uses `GuidebookBlock` (`src/components/extensions/GuidebookBlock.tsx`). EPUB export serializes blocks via `serializeGuidebookBlock()` in `src/lib/epub.ts`. Print preview styles are in `src/app/globals.css`.

List items inside payloads use stable `id` fields for React keys and survive save/load via `normalize*Payload()` helpers.

The **Guidebook** template ships sample chapters built from `src/lib/guidebook-seed.ts` — deterministic seed payloads and `serializeGuidebookBlockToHtml()` for TipTap-compatible markup. Template wiring lives in `src/lib/templates.ts` (chapters **Chapter 1: Getting Started** and **Trail Reference**).

## Consequences

### Positive

- First-class guidebook semantics in editor and export
- Shared payload contract across editor, preview, and EPUB
- Extensible by adding new `GuidebookBlockType` values

### Negative

- New block types require TipTap extension, CSS, and EPUB serializer updates
- Payload JSON in HTML attributes has size limits for very large blocks

### Agent rules

- **Must not** flatten guidebook blocks to generic `<div>` HTML in the editor
- **Must** add new block types via `GuidebookBlockType` + `defaultGuidebookPayload` + EPUB transform
- **Must** test editor, print preview, and EPUB export together for block changes

## Related code

- `src/types/guidebook.ts`
- `src/lib/guidebook-seed.ts` — template seed payloads and HTML serialization
- `src/lib/templates.ts` — Guidebook template sample chapters
- `src/components/extensions/GuidebookBlock.tsx`
- `src/components/RichEditor.tsx`
- `src/lib/epub.ts`
- `src/app/globals.css`
- `src/app/prototype/guidebook/page.tsx`
- `docs/guidebook-blocks.md` — developer reference
