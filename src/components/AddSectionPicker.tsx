"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ChapterSectionType } from "@/types/book";
import { getSectionsByCategory } from "@/lib/chapter-sections";

interface AddSectionPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ChapterSectionType) => void;
}

export default function AddSectionPicker({ open, onClose, onSelect }: AddSectionPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const categories = getSectionsByCategory();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121A2B] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">Add Section</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a page type — chapters, journal pages, workbook exercises, and more.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {categories.map(({ key, label, sections }) => (
            <div key={key}>
              <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider px-2 mb-2">
                {label}
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onSelect(section.id);
                      onClose();
                    }}
                    className="text-left px-3 py-2.5 rounded-xl border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
                  >
                    <span className="block text-sm font-medium text-white group-hover:text-cyan-300">
                      {section.name}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
                      {section.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
