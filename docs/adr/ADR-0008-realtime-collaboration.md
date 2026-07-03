# ADR-0008: Realtime collaboration (Yjs + TipTap)

- **Status:** Accepted
- **Date:** 2026-07-03
- **Issue:** [#22](https://github.com/freqkflag/openbook-author/issues/22)

## Decision

Wave C ships a **local prototype** using Yjs + `BroadcastChannel` for same-machine two-tab sync (no production WebSocket server in v1).

- Collaboration state is ephemeral — not persisted to `.openbook` until explicit save
- Production multi-user beta requires a self-hosted y-websocket relay (documented, out of MVP scope)
- TipTap binds to `Y.XmlFragment` on the active chapter when collab mode is enabled

## Consequences

- Prototype validates UX; authors must run relay for true multi-device collab
- Conflict with ADR-0006 LWW backup — collab sessions save via normal book store

## Related code

- `src/lib/collab/yjs-chapter.ts`
- `src/components/CollabPanel.tsx`
