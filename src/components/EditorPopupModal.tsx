"use client";

import { useEffect, useId, useState } from "react";
import { MessageSquare, X } from "lucide-react";

interface EditorPopupModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, body: string) => void;
}

const inputClass =
  "w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30";
const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

export default function EditorPopupModal({ open, onClose, onSubmit }: EditorPopupModalProps) {
  const titleId = useId();
  const bodyId = useId();
  const [title, setTitle] = useState("Tap to reveal");
  const [body, setBody] = useState("Hidden content goes here.");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(title.trim() || "Tap to reveal", body.trim() || "Hidden content goes here.");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-modal-title"
    >
      <form
        className="w-full max-w-md rounded-xl border border-fuchsia-500/30 bg-[#121A2B] shadow-[0_0_24px_rgba(217,70,239,0.12)]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-fuchsia-300">
            <MessageSquare size={16} aria-hidden />
            <span id="popup-modal-title">Insert popup widget</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close popup dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <label htmlFor={titleId} className={labelClass}>
              Title
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tap to reveal"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor={bodyId} className={labelClass}>
              Body
            </label>
            <textarea
              id={bodyId}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hidden content goes here."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
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
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 hover:bg-fuchsia-500/30 hover:shadow-[0_0_12px_rgba(217,70,239,0.2)]"
          >
            Insert popup
          </button>
        </div>
      </form>
    </div>
  );
}
