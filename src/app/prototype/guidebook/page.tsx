"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Book } from "@/types/book";
import { getDefaultKbpForTemplate } from "@/lib/templates";
import RichEditor from "@/components/RichEditor";
import PrintPreview from "@/components/PrintPreview";

const PROTOTYPE_BOOK_ID = "prototype-guidebook";

const initialContent = `<h1>Chapter 1: The Ridge Trail</h1>
<p class="no-indent">This prototype chapter demonstrates guidebook blocks as first-class content — not generic HTML. Insert blocks from the toolbar and watch the print preview update live.</p>
<h2>Section: Morning Ascent</h2>
<p>Use the trail stop block for waypoints, the workshop for reflective exercises, and the cheat sheet for quick reference tables.</p>`;

function createPrototypeBook(): Book {
  const now = new Date().toISOString();
  return {
    id: PROTOTYPE_BOOK_ID,
    metadata: {
      title: "Guidebook Block Prototype",
      subtitle: "Trail · Workshop · Cheat Sheet",
      author: "OpenBook Author",
      publisher: "OpenBook Author",
      language: "en",
      description: "Prototype page for guidebook block types.",
    },
    template: "guidebook",
    layoutMode: "portrait",
    formatProfile: "kbp",
    kbpSettings: getDefaultKbpForTemplate("guidebook"),
    chapters: [
      {
        id: "ch-prototype-1",
        title: "The Ridge Trail",
        content: initialContent,
        order: 0,
        sectionType: "chapter",
      },
    ],
    assets: [],
    createdAt: now,
    updatedAt: now,
  };
}

export default function GuidebookPrototypePage() {
  const [book] = useState<Book>(() => createPrototypeBook());
  const [content, setContent] = useState(initialContent);
  const chapter = book.chapters[0];

  const previewBook = useMemo(
    () => ({
      ...book,
      chapters: [{ ...chapter, content }],
    }),
    [book, chapter, content]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#05070D]">
      <header className="shrink-0 border-b border-white/10 bg-[#0B1020]/90 backdrop-blur-sm px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft size={16} />
          Home
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-cyan-300">Guidebook Block Prototype</h1>
          <p className="text-xs text-slate-500">
            Chapter → Section → Guidebook Block → Preview / Export
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-fuchsia-400/80 border border-fuchsia-500/30 rounded px-2 py-0.5">
          Prototype
        </span>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 min-h-0">
        <section className="flex flex-col min-h-[520px] lg:min-h-0">
          <div className="mb-2 px-1">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Editor</h2>
            <p className="text-xs text-slate-600">
              Toolbar: trail stop (green), workshop (fuchsia), cheat sheet (cyan). Drag the grip to reorder blocks.
            </p>
          </div>
          <div className="flex-1 min-h-0">
            <RichEditor
              book={book}
              content={content}
              onChange={setContent}
              placeholder="Write your guidebook section…"
              kbpMode
            />
          </div>
        </section>

        <section className="flex flex-col min-h-[520px] lg:min-h-0">
          <div className="mb-2 px-1">
            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Print Preview
            </h2>
            <p className="text-xs text-slate-600">Live export-style rendering</p>
          </div>
          <div className="flex-1 min-h-0">
            <PrintPreview
              book={previewBook}
              chapterTitle={chapter.title}
              chapterContent={content}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
