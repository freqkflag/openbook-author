"use client";

import { useEffect, useId, useState } from "react";
import { Link as LinkIcon, X } from "lucide-react";

interface EditorLinkModalProps {
  open: boolean;
  initialUrl?: string;
  initialLabel?: string;
  onClose: () => void;
  onSubmit: (url: string, label?: string) => void;
}

const inputClass =
  "w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30";
const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

export default function EditorLinkModal({
  open,
  initialUrl = "",
  initialLabel = "",
  onClose,
  onSubmit,
}: EditorLinkModalProps) {
  const urlId = useId();
  const labelId = useId();
  const [url, setUrl] = useState(initialUrl);
  const [linkLabel, setLinkLabel] = useState(initialLabel);

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
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    onSubmit(trimmedUrl, linkLabel.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
    >
      <form
        className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-[#121A2B] shadow-[0_0_24px_rgba(0,229,255,0.12)]"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
            <LinkIcon size={16} aria-hidden />
            <span id="link-modal-title">Insert link</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close link dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <label htmlFor={urlId} className={labelClass}>
              URL
            </label>
            <input
              id={urlId}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor={labelId} className={labelClass}>
              Label <span className="text-slate-600 font-normal">(optional)</span>
            </label>
            <input
              id={labelId}
              type="text"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="Link text"
              className={inputClass}
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
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 hover:shadow-[0_0_12px_rgba(0,229,255,0.2)]"
          >
            Apply link
          </button>
        </div>
      </form>
    </div>
  );
}
