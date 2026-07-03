import * as Y from "yjs";

const channels = new Map<string, BroadcastChannel>();

/** Local two-tab Yjs prototype (ADR-0008) */
export function createChapterCollabDoc(bookId: string, chapterId: string) {
  const room = `${bookId}:${chapterId}`;
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("prosemirror");

  if (typeof BroadcastChannel !== "undefined") {
    let channel = channels.get(room);
    if (!channel) {
      channel = new BroadcastChannel(`openbook-collab:${room}`);
      channels.set(room, channel);
    }

    channel.onmessage = (event: MessageEvent<{ update?: Uint8Array }>) => {
      if (event.data?.update) {
        Y.applyUpdate(doc, new Uint8Array(event.data.update));
      }
    };

    doc.on("update", (update: Uint8Array) => {
      channel?.postMessage({ update: Array.from(update) });
    });
  }

  return { doc, fragment, room };
}

export function destroyChapterCollabDoc(room: string) {
  const channel = channels.get(room);
  channel?.close();
  channels.delete(room);
}
