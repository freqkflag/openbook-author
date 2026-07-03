"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  BookOpen,
  GripVertical,
} from "lucide-react";
import type { Chapter, ChapterSectionType } from "@/types/book";
import { getSectionTemplate } from "@/lib/chapter-sections";
import AddSectionPicker from "@/components/AddSectionPicker";

const SECTION_SHORT_LABELS: Partial<Record<ChapterSectionType, string>> = {
  chapter: "Ch",
  indented: "In",
  introduction: "Intro",
  appendix: "App",
  journal: "Jrnl",
  workbook: "WB",
  checklist: "List",
  reflection: "Refl",
  quote: "Quote",
  "photo-spread": "Photo",
  timeline: "Time",
  glossary: "Gloss",
  interview: "Q&A",
  takeaways: "Keys",
};

interface ChapterSidebarProps {
  chapters: Chapter[];
  activeChapterId: string;
  onSelect: (id: string) => void;
  onAddSection: (type: ChapterSectionType) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
}

export default function ChapterSidebar({
  chapters,
  activeChapterId,
  onSelect,
  onAddSection,
  onDelete,
  onRename,
  onReorder,
}: ChapterSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full bg-[#121A2B]/60 border-r border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <BookOpen size={16} className="text-cyan-400" />
            Sections
          </div>
          <button
            onClick={() => setShowPicker(true)}
            className="p-1.5 rounded-md text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="Add section"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {chapters.map((chapter, idx) => {
            const sectionType = chapter.sectionType ?? "chapter";
            const badge = SECTION_SHORT_LABELS[sectionType] ?? "Sec";
            const isSpecial = sectionType !== "chapter";

            return (
              <div
                key={chapter.id}
                className={`group mx-2 mb-1 rounded-lg transition-all ${
                  activeChapterId === chapter.id
                    ? "bg-cyan-500/10 border border-cyan-500/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-1 px-2 py-2">
                  <GripVertical size={12} className="text-slate-600 shrink-0" />
                  {isSpecial && (
                    <span
                      className="shrink-0 text-[10px] font-medium px-1 py-0.5 rounded bg-purple-500/20 text-purple-300"
                      title={getSectionTemplate(sectionType).name}
                    >
                      {badge}
                    </span>
                  )}
                  {editingId === chapter.id ? (
                    <input
                      autoFocus
                      defaultValue={chapter.title}
                      onBlur={(e) => {
                        onRename(chapter.id, e.target.value || "Untitled");
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onRename(chapter.id, e.currentTarget.value || "Untitled");
                          setEditingId(null);
                        }
                      }}
                      className="flex-1 bg-transparent text-sm text-white outline-none border-b border-cyan-500/50"
                    />
                  ) : (
                    <button
                      onClick={() => onSelect(chapter.id)}
                      onDoubleClick={() => setEditingId(chapter.id)}
                      className="flex-1 text-left text-sm text-slate-300 truncate"
                    >
                      {idx + 1}. {chapter.title}
                    </button>
                  )}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onReorder(chapter.id, "up")}
                      disabled={idx === 0}
                      className="p-0.5 text-slate-500 hover:text-cyan-400 disabled:opacity-30"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => onReorder(chapter.id, "down")}
                      disabled={idx === chapters.length - 1}
                      className="p-0.5 text-slate-500 hover:text-cyan-400 disabled:opacity-30"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <button
                      onClick={() => {
                        if (chapters.length > 1 && confirm("Delete this section?")) {
                          onDelete(chapter.id);
                        }
                      }}
                      className="p-0.5 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AddSectionPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={onAddSection}
      />
    </>
  );
}
