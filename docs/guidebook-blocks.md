# Guidebook blocks

Structured content blocks for the **Guidebook** template and KBP-formatted books. Blocks are first-class TipTap nodes — not generic HTML — and export consistently to print preview and EPUB.

Architecture: [ADR-0001](adr/ADR-0001-guidebook-block-model.md).

## Block types

| Type | Attribute | Purpose |
|------|-----------|---------|
| Trail stop | `trail_stop` | Waypoint with name, mile marker, elevation, notes, and amenity list |
| Workshop | `workshop` | Title plus reflective exercises with `short` or `long` response hints |
| Cheat sheet | `cheat_sheet` | Title plus label/value items in a 2- or 3-column grid |

Insert blocks from the **Guidebook** section of the editor toolbar. Drag the grip handle to reorder.

## HTML storage format

Chapter HTML stores each block as an `<aside>` with JSON in `data-payload`:

```html
<aside
  data-guidebook="trail_stop"
  data-payload="{&quot;name&quot;:&quot;Summit Vista&quot;,...}"
  class="guidebook-block guidebook-trail-stop"
></aside>
```

- `data-guidebook` — block type (`trail_stop`, `workshop`, `cheat_sheet`)
- `data-payload` — JSON-serialized payload; `&` and `"` must be HTML-entity escaped
- CSS class — `guidebook-{type-with-hyphens}` (e.g. `guidebook-trail-stop`)

Payload types and `normalize*Payload()` helpers live in `src/types/guidebook.ts`. The TipTap extension is `src/components/extensions/GuidebookBlock.tsx`. EPUB export uses `serializeGuidebookBlock()` in `src/lib/epub.ts`.

## Template seed content

`src/lib/guidebook-seed.ts` provides deterministic sample content for the Guidebook template:

| Export | Description |
|--------|-------------|
| `SEED_IDS` | Stable amenity/exercise/item IDs for tests and save/load |
| `seedTrailStopPayload` | Summit Vista Overlook sample waypoint |
| `seedWorkshopPayload` | Trail Reflection Workshop exercises |
| `seedCheatSheetPayload` | Trail Quick Reference label/value grid |
| `serializeGuidebookBlockToHtml(type, payload?)` | Build parseable `<aside>` markup |
| `buildGettingStartedChapterContent()` | Chapter 1 HTML with one of each block type |
| `buildTrailReferenceChapterContent()` | Trail Reference chapter with variant trail stop |

The Guidebook template (`src/lib/templates.ts`) wires these builders into sample chapters **Chapter 1: Getting Started** and **Trail Reference**.

## Example: programmatic block HTML

```typescript
import {
  serializeGuidebookBlockToHtml,
  seedTrailStopPayload,
} from "@/lib/guidebook-seed";

const html = serializeGuidebookBlockToHtml("trail_stop", {
  ...seedTrailStopPayload,
  name: "Creek Crossing Junction",
  mileMarker: "1.8",
});
```

Omit the second argument to use `defaultGuidebookPayload()` from `src/types/guidebook.ts`.

## Prototype page

Interactive editor + print preview demo: [http://localhost:3000/prototype/guidebook](http://localhost:3000/prototype/guidebook) (`src/app/prototype/guidebook/page.tsx`). The prototype starts with minimal content; new books from the Guidebook template include full seed chapters.

## Testing

- `src/lib/guidebook-seed.test.ts` — serialization, seed payloads, EPUB export integration
- `src/lib/templates.test.ts` — template chapters reference seed builders

When changing block shapes, update normalization in `src/types/guidebook.ts`, the TipTap extension, `src/lib/epub.ts`, print styles in `src/app/globals.css`, and seed payloads together.
