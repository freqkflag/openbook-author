# ADR-0002: Widget plugin API

- **Status:** Accepted
- **Date:** 2026-07-03

## Keywords

`popup`, `gallery`, `widget`, `tiptap`, `ibooks`

## Context

OpenBook Author supports iBooks Author–style interactive widgets (tap-to-reveal popups, image galleries). Widgets must live in the editor as structured nodes and export to reflowable EPUB without JavaScript.

## Decision

Interactive widgets are **TipTap node extensions** under `src/components/extensions/`:

- `PopupWidget` — `<details>`-based tap-to-reveal content
- `GalleryWidget` — multi-image carousel with captions

Widgets are registered in `RichEditor` like other block nodes. EPUB export transforms widget HTML in `transformWidgetsForEpub()` inside `src/lib/epub.ts` (same pipeline as guidebook blocks and KBP callouts).

New widgets follow the pattern: TipTap extension → editor toolbar insert → HTML `data-*` attributes → EPUB transform function.

## Consequences

### Positive

- Consistent extension pattern for all rich content types
- EPUB output uses semantic HTML (`<details>`, styled figures) without runtime JS

### Negative

- EPUB readers vary in `<details>` support; galleries are static in export
- Each widget needs its own transform branch in `epub.ts`

### Agent rules

- **Must** implement new widgets as TipTap extensions, not ad-hoc `contentEditable` hacks
- **Must** add EPUB transform logic in `transformWidgetsForEpub()` or a dedicated helper called from it
- **Must not** add widget behavior that only works in the browser preview but breaks export

## Related code

- `src/components/extensions/PopupWidget.tsx`
- `src/components/extensions/GalleryWidget.tsx`
- `src/components/RichEditor.tsx`
- `src/lib/epub.ts` (`transformWidgetsForEpub`)
