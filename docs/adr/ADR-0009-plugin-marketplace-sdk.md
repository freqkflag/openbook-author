# ADR-0009: Plugin marketplace and third-party widget SDK

- **Status:** Accepted
- **Date:** 2026-07-03

## Decision

Formalize ADR-0002 into a **Plugin SDK preview**:

- Document widget contract in `docs/plugin-sdk.md`
- Export `registerWidget()` helper typing TipTap node + EPUB transform registration
- Ship one **community example** widget (`TimelineWidget`) as reference implementation

Marketplace hosting and signed bundles are Wave D+ — SDK is documentation + pattern only.

## Related code

- `docs/plugin-sdk.md`
- `src/lib/plugin-sdk/register-widget.ts`
- `src/components/extensions/TimelineWidget.tsx`
