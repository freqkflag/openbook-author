"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createChapterCollabDoc, destroyChapterCollabDoc } from "@/lib/collab/yjs-chapter";

interface CollabPanelProps {
  bookId: string;
  chapterId: string;
}

export default function CollabPanel({ bookId, chapterId }: CollabPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [room, setRoom] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !chapterId) return;
    const { room: collabRoom } = createChapterCollabDoc(bookId, chapterId);
    setRoom(collabRoom);
    return () => {
      destroyChapterCollabDoc(collabRoom);
      setRoom(null);
    };
  }, [enabled, bookId, chapterId]);

  return (
    <div className="space-y-2 pt-3 border-t border-white/10">
      <h3 className="text-xs font-medium text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
        <Users size={14} />
        Collab (beta)
      </h3>
      <p className="text-xs text-slate-500">
        Yjs prototype — open this chapter in two tabs with collab enabled to sync edits via BroadcastChannel.
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded border-white/20"
        />
        Enable local collab session
      </label>
      {room && (
        <p className="text-[10px] text-slate-600 font-mono truncate" title={room}>
          Room: {room}
        </p>
      )}
    </div>
  );
}
