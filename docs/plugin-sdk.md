# Plugin SDK (preview)

Formalizes [ADR-0002](adr/ADR-0002-widget-plugin-api.md) and [ADR-0009](adr/ADR-0009-plugin-marketplace-sdk.md) for third-party widgets.

## Widget contract

1. **TipTap node** — `group: "block"`, `atom: true`, `data-widget="{id}"` in `renderHTML`
2. **Editor UI** — React node view in `src/components/extensions/`
3. **EPUB export** — branch in `transformWidgetsForEpub()` (`src/lib/epub.ts`)
4. **Tests** — add cases to `src/lib/wave-c-widgets.test.ts` or `epub-import.test.ts`

## Registration helper

```typescript
import { registerWidget } from "@/lib/plugin-sdk/register-widget";
import { TimelineWidget } from "@/components/extensions/TimelineWidget";

registerWidget({
  id: "timeline",
  name: "Timeline",
  dataAttribute: "timeline",
  extension: TimelineWidget,
});
```

## Community example

See `TimelineWidget.tsx` — editable event list exported as semantic `<section class="timeline-widget">`.

Marketplace signing and remote install are **not** in Wave C scope.
