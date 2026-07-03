"use client";

import { useMemo, useState, type DragEvent } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  BookOpen,
  GripVertical,
  BookmarkPlus,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import type { BookPart, Chapter, ChapterSectionType } from "@/types/book";
import { getPartForChapter, hasHierarchicalToc } from "@/lib/book-structure";
import { getSectionTemplate } from "@/lib/chapter-sections";
import AddSectionPicker from "@/components/AddSectionPicker";
import type { UserSectionTemplate } from "@/lib/section-template-store";

const SECTION_SHORT_LABELS: Partial<Record<ChapterSectionType, string>> = {
  chapter: "Ch",
  copyright: "©",
  dedication: "Ded",
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
  resources: "Res",
  "learning-objectives": "Obj",
  "practice-quiz": "Quiz",
  bibliography: "Bib",
};

interface ChapterSidebarProps {
  chapters: Chapter[];
  parts?: BookPart[];
  activeChapterId: string;
  onSelect: (id: string) => void;
  onAddSection: (type: ChapterSectionType) => void;
  onAddCustomTemplate?: (template: UserSectionTemplate) => void;
  onSaveAsTemplate?: (chapter: Chapter) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onReorderChapters?: (fromIndex: number, toIndex: number) => void;
  onAddPart?: () => void;
  onRenamePart?: (partId: string, title: string) => void;
  onDeletePart?: (partId: string) => void;
  onReorderPart?: (partId: string, direction: "up" | "down") => void;
  onAssignChapterToPart?: (chapterId: string, partId: string | null) => void;
}

type SidebarRow =
  | { kind: "chapter"; chapter: Chapter; index: number }
  | { kind: "part-header"; part: BookPart; partIndex: number };

function buildSidebarRows(chapters: Chapter[], parts?: BookPart[]): SidebarRow[] {
  if (!parts?.length) {
    return chapters.map((chapter, index) => ({ kind: "chapter", chapter, index }));
  }

  const rows: SidebarRow[] = [];
  const sortedParts = parts.slice().sort((a, b) => a.order - b.order);
  const chapterById = new Map(chapters.map((ch) => [ch.id, ch]));
  const grouped = new Set(parts.flatMap((p) => p.chapterIds));

  chapters.forEach((chapter, index) => {
    if (!grouped.has(chapter.id)) {
      rows.push({ kind: "chapter", chapter, index });
    }
  });

  sortedParts.forEach((part, partIndex) => {
    rows.push({ kind: "part-header", part, partIndex });
    part.chapterIds.forEach((chapterId) => {
      const chapter = chapterById.get(chapterId);
      const index = chapters.findIndex((ch) => ch.id === chapterId);
      if (chapter && index >= 0) {
        rows.push({ kind: "chapter", chapter, index });
      }
    });
  });

  return rows;
}

export default function ChapterSidebar({
  chapters,
  parts,
  activeChapterId,
  onSelect,
  onAddSection,
  onAddCustomTemplate,
  onSaveAsTemplate,
  onDelete,
  onRename,
  onReorder,
  onReorderChapters,
  onAddPart,
  onRenamePart,
  onDeletePart,
  onReorderPart,
  onAssignChapterToPart,
}: ChapterSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [collapsedParts, setCollapsedParts] = useState<Set<string>>(new Set());

  const hierarchical = hasHierarchicalToc({ chapters, parts } as { chapters: Chapter[]; parts?: BookPart[] });
  const rows = useMemo(() => buildSidebarRows(chapters, parts), [chapters, parts]);

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && dragIndex !== index) {
      setDropIndex(index);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const from = dragIndex ?? parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!Number.isNaN(from) && from !== index && onReorderChapters) {
      onReorderChapters(from, index);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const togglePartCollapsed = (partId: string) => {
    setCollapsedParts((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  };

  const activeChapter = chapters.find((chapter) => chapter.id === activeChapterId);

  function renderChapterRow(chapter: Chapter, idx: number, nested = false) {
    const sectionType = chapter.sectionType ?? "chapter";
    const badge = SECTION_SHORT_LABELS[sectionType] ?? "Sec";
    const isSpecial = sectionType !== "chapter";
    const isDragging = dragIndex === idx;
    const isDropTarget = dropIndex === idx && dragIndex !== idx;
    const currentPart = getPartForChapter({ chapters, parts } as { chapters: Chapter[]; parts?: BookPart[] }, chapter.id);

    return (
      <div
        key={chapter.id}
        onDragOver={(e) => handleDragOver(e, idx)}
        onDrop={(e) => handleDrop(e, idx)}
        className={`group mx-2 mb-1 rounded-lg transition-all ${
          nested ? "ml-5 mr-2" : ""
        } ${
          activeChapterId === chapter.id
            ? "bg-cyan-500/10 border border-cyan-500/30"
            : "hover:bg-white/5 border border-transparent"
        } ${isDragging ? "opacity-40" : ""} ${
          isDropTarget ? "ring-1 ring-cyan-400/50 bg-cyan-500/5" : ""
        }`}
      >
        <div className="flex items-center gap-1 px-2 py-2">
          {onReorderChapters ? (
            <button
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              aria-grabbed={isDragging}
              aria-label={`Drag to reorder ${chapter.title}`}
              className="shrink-0 p-0.5 text-slate-600 cursor-grab active:cursor-grabbing hover:text-cyan-400"
              title="Drag to reorder"
            >
              <GripVertical size={12} />
            </button>
          ) : (
            <span className="shrink-0 p-0.5 text-slate-600" aria-hidden>
              <GripVertical size={12} />
            </span>
          )}
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
              type="button"
              onClick={() => onSelect(chapter.id)}
              onDoubleClick={() => setEditingId(chapter.id)}
              className="flex-1 text-left text-sm text-slate-300 truncate"
            >
              {idx + 1}. {chapter.title}
            </button>
          )}
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {hierarchical && onAssignChapterToPart && parts && parts.length > 0 && (
              <select
                aria-label={`Move ${chapter.title} to part`}
                value={currentPart?.id ?? ""}
                onChange={(e) =>
                  onAssignChapterToPart(chapter.id, e.target.value || null)
                }
                className="max-w-[4.5rem] text-[10px] bg-[#0B1020] border border-white/10 rounded px-1 py-0.5 text-slate-400"
                title="Move to part"
              >
                <option value="">—</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.title.slice(0, 12)}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => onReorder(chapter.id, "up")}
              disabled={idx === 0}
              className="p-0.5 text-slate-500 hover:text-cyan-400 disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              onClick={() => onReorder(chapter.id, "down")}
              disabled={idx === chapters.length - 1}
              className="p-0.5 text-slate-500 hover:text-cyan-400 disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown size={12} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (chapters.length > 1 && confirm("Delete this section?")) {
                  onDelete(chapter.id);
                }
              }}
              className="p-0.5 text-slate-500 hover:text-red-400"
              title="Delete section"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-[#121A2B]/60 border-r border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <BookOpen size={16} className="text-cyan-400" />
            Sections
          </div>
          <div className="flex items-center gap-1">
            {onAddPart && (
              <button
                type="button"
                onClick={onAddPart}
                className="p-1.5 rounded-md text-fuchsia-400 hover:bg-fuchsia-500/10 transition-colors"
                title="Add part / volume"
              >
                <FolderOpen size={16} />
              </button>
            )}
            {onSaveAsTemplate && activeChapter && (
              <button
                type="button"
                onClick={() => onSaveAsTemplate(activeChapter)}
                className="p-1.5 rounded-md text-purple-400 hover:bg-purple-500/10 transition-colors"
                title="Save current section as template"
              >
                <BookmarkPlus size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="p-1.5 rounded-md text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              title="Add section"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {rows.map((row) => {
            if (row.kind === "part-header") {
              const { part, partIndex } = row;
              const collapsed = collapsedParts.has(part.id);
              const sortedParts = parts!.slice().sort((a, b) => a.order - b.order);

              return (
                <div key={part.id} className="group mx-2 mb-2">
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20">
                    <button
                      type="button"
                      onClick={() => togglePartCollapsed(part.id)}
                      className="p-0.5 text-fuchsia-300"
                      aria-expanded={!collapsed}
                      title={collapsed ? "Expand part" : "Collapse part"}
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
                      />
                    </button>
                    <FolderOpen size={14} className="text-fuchsia-400 shrink-0" />
                    {editingPartId === part.id ? (
                      <input
                        autoFocus
                        defaultValue={part.title}
                        onBlur={(e) => {
                          onRenamePart?.(part.id, e.target.value || "Untitled Part");
                          setEditingPartId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onRenamePart?.(part.id, e.currentTarget.value || "Untitled Part");
                            setEditingPartId(null);
                          }
                        }}
                        className="flex-1 bg-transparent text-xs font-medium text-fuchsia-200 outline-none border-b border-fuchsia-500/50"
                      />
                    ) : (
                      <button
                        type="button"
                        onDoubleClick={() => setEditingPartId(part.id)}
                        className="flex-1 text-left text-xs font-medium text-fuchsia-200 truncate"
                      >
                        {part.title}
                        <span className="ml-1 text-fuchsia-400/60">
                          ({part.chapterIds.length})
                        </span>
                      </button>
                    )}
                    <div className="flex items-center opacity-0 group-hover:opacity-100">
                      {onReorderPart && (
                        <>
                          <button
                            type="button"
                            onClick={() => onReorderPart(part.id, "up")}
                            disabled={partIndex === 0}
                            className="p-0.5 text-fuchsia-400/60 hover:text-fuchsia-300 disabled:opacity-30"
                            title="Move part up"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onReorderPart(part.id, "down")}
                            disabled={partIndex === sortedParts.length - 1}
                            className="p-0.5 text-fuchsia-400/60 hover:text-fuchsia-300 disabled:opacity-30"
                            title="Move part down"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </>
                      )}
                      {onDeletePart && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete part “${part.title}”? Chapters will become ungrouped.`)) {
                              onDeletePart(part.id);
                            }
                          }}
                          className="p-0.5 text-fuchsia-400/60 hover:text-red-400"
                          title="Delete part"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  {!collapsed &&
                    part.chapterIds.length === 0 && (
                      <p className="ml-7 mt-1 text-[10px] text-slate-500 italic">
                        No chapters — assign from dropdown
                      </p>
                    )}
                </div>
              );
            }

            const partId = getPartForChapter(
              { chapters, parts } as { chapters: Chapter[]; parts?: BookPart[] },
              row.chapter.id
            )?.id;
            if (partId && collapsedParts.has(partId)) {
              return null;
            }

            return renderChapterRow(row.chapter, row.index, Boolean(partId));
          })}
        </div>
      </div>

      <AddSectionPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={onAddSection}
        onSelectCustomTemplate={onAddCustomTemplate}
      />
    </>
  );
}
