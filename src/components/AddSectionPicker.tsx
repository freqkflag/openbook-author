"use client";

import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import type { ChapterSectionType } from "@/types/book";
import { getSectionsByCategory } from "@/lib/chapter-sections";
import {
  loadUserSectionTemplates,
  type UserSectionTemplate,
} from "@/lib/section-template-store";

interface AddSectionPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ChapterSectionType) => void;
  onSelectCustomTemplate?: (template: UserSectionTemplate) => void;
}

export default function AddSectionPicker({
  open,
  onClose,
  onSelect,
  onSelectCustomTemplate,
}: AddSectionPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const userTemplates = useMemo(
    () => (open ? loadUserSectionTemplates() : []),
    [open]
  );

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
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {userTemplates.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider px-2 mb-2">
                My templates
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {userTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      onSelectCustomTemplate?.(template);
                      onClose();
                    }}
                    className="text-left px-3 py-2.5 rounded-xl border border-transparent hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 transition-all group"
                  >
                    <span className="block text-sm font-medium text-white group-hover:text-fuchsia-300">
                      {template.name}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
                      {template.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {categories.map(({ key, label, sections }) => (
            <div key={key}>
              <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider px-2 mb-2">
                {label}
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
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
