"use client";

import { useEffect, useId, useState } from "react";
import { BookOpen, X } from "lucide-react";
import type { NoteType } from "@/components/extensions/NoteReference";

interface EditorNoteModalProps {
  open: boolean;
  noteType: NoteType;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

const inputClass =
  "w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30";
const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

export default function EditorNoteModal({
  open,
  noteType,
  onClose,
  onSubmit,
}: EditorNoteModalProps) {
  const bodyId = useId();
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const title = noteType === "footnote" ? "Insert footnote" : "Insert endnote";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(body.trim());
    setBody("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
    >
      <form
        className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-[#121A2B] shadow-[0_0_24px_rgba(0,229,255,0.12)]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
            <BookOpen size={16} aria-hidden />
            <span id="note-modal-title">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close note dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4">
          <label htmlFor={bodyId} className={labelClass}>
            Note text
          </label>
          <textarea
            id={bodyId}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              noteType === "footnote"
                ? "Citation or explanation for this footnote…"
                : "Endnote content (appears at chapter end)…"
            }
            rows={4}
            className={`${inputClass} resize-none`}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
          >
            Insert {noteType === "footnote" ? "footnote" : "endnote"}
          </button>
        </div>
      </form>
    </div>
  );
}
