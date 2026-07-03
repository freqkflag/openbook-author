"use client";

import type { Book, KBPSettings } from "@/types/book";

interface MetadataPanelProps {
  book: Book;
  onUpdate: (metadata: Partial<Book["metadata"]>) => void;
  onUpdateKBP: (settings: Partial<KBPSettings>) => void;
  onSetFormatProfile: (profile: Book["formatProfile"]) => void;
}

export default function MetadataPanel({
  book,
  onUpdate,
  onUpdateKBP,
  onSetFormatProfile,
}: MetadataPanelProps) {
  const { metadata, kbpSettings, formatProfile } = book;
  const kbpActive = formatProfile === "kbp" || kbpSettings.enabled;

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider">
        Book Properties
      </h3>

      {(
        [
          ["title", "Title", "text"],
          ["subtitle", "Subtitle", "text"],
          ["author", "Author", "text"],
          ["publisher", "Publisher", "text"],
          ["language", "Language", "text"],
          ["description", "Description", "textarea"],
        ] as const
      ).map(([key, label, type]) => (
        <label key={key} className="block text-xs text-slate-400">
          {label}
          {type === "textarea" ? (
            <textarea
              value={metadata[key]}
              onChange={(e) => onUpdate({ [key]: e.target.value })}
              rows={3}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
            />
          ) : (
            <input
              type="text"
              value={metadata[key]}
              onChange={(e) => onUpdate({ [key]: e.target.value })}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          )}
        </label>
      ))}

      <div className="pt-3 border-t border-white/10 space-y-3">
        <h3 className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider">
          KBP Formatting
        </h3>
        <p className="text-xs text-slate-500">
          Kindle Book Publishing profile — optimized typography and structure for KDP export.
        </p>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={kbpActive}
            onChange={(e) => {
              onSetFormatProfile(e.target.checked ? "kbp" : "standard");
            }}
            className="rounded border-white/20 bg-[#0B1020] text-fuchsia-500"
          />
          Enable KBP profile
        </label>

        {kbpActive && (
          <>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={kbpSettings.firstLineIndent}
                onChange={(e) => onUpdateKBP({ firstLineIndent: e.target.checked })}
                className="rounded border-white/20 bg-[#0B1020] text-cyan-500"
              />
              First-line paragraph indent
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={kbpSettings.dropCaps}
                onChange={(e) => onUpdateKBP({ dropCaps: e.target.checked })}
                className="rounded border-white/20 bg-[#0B1020] text-cyan-500"
              />
              Drop caps on chapter open
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={kbpSettings.chapterNumbering}
                onChange={(e) => onUpdateKBP({ chapterNumbering: e.target.checked })}
                className="rounded border-white/20 bg-[#0B1020] text-cyan-500"
              />
              Chapter numbering
            </label>
            <label className="block text-xs text-slate-400">
              Scene break style
              <select
                value={kbpSettings.sceneBreakStyle}
                onChange={(e) =>
                  onUpdateKBP({
                    sceneBreakStyle: e.target.value as KBPSettings["sceneBreakStyle"],
                  })
                }
                className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="asterisks">* * *</option>
                <option value="line">Horizontal line</option>
                <option value="ornament">✦ ✦ ✦</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div className="pt-2 border-t border-white/10">
        <p className="text-xs text-slate-500">
          Layout: <span className="text-slate-300 capitalize">{book.layoutMode}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Template: <span className="text-slate-300 capitalize">{book.template}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Format: <span className="text-slate-300 uppercase">{formatProfile}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Chapters: <span className="text-slate-300">{book.chapters.length}</span>
        </p>
      </div>
    </div>
  );
}
