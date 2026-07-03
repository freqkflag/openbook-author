"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Sparkles,
  PanelRight,
  PanelRightClose,
  Settings2,
  Save,
  Pencil,
  Eye,
} from "lucide-react";
import { useBookStore } from "@/store/book-store";
import ChapterSidebar from "@/components/ChapterSidebar";
import RichEditor from "@/components/RichEditor";
import PrintPreview from "@/components/PrintPreview";
import AIAssistant from "@/components/AIAssistant";
import MetadataPanel from "@/components/MetadataPanel";
import { downloadEpub, exportBookJson } from "@/lib/epub";
import { downloadKBP } from "@/lib/kbp-export";
import { isKbpEnabled } from "@/lib/kbp";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const {
    books,
    hydrated,
    hydrate,
    setCurrentBook,
    updateMetadata,
    updateKBPSettings,
    setFormatProfile,
    addSection,
    updateChapter,
    deleteChapter,
    reorderChapter,
  } = useBookStore();

  const [activeChapterId, setActiveChapterId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [showAI, setShowAI] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (bookId) setCurrentBook(bookId);
  }, [bookId, setCurrentBook]);

  const book = books.find((b) => b.id === bookId);
  const activeChapter = book?.chapters.find((ch) => ch.id === activeChapterId);

  useEffect(() => {
    if (book && book.chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(book.chapters[0].id);
    }
  }, [book, activeChapterId]);

  const handleContentChange = useCallback(
    (html: string) => {
      if (!book || !activeChapterId) return;
      updateChapter(book.id, activeChapterId, { content: html });
    },
    [book, activeChapterId, updateChapter]
  );

  const handleAIApply = (html: string, mode: "replace" | "append") => {
    if (!book || !activeChapter) return;
    const newContent =
      mode === "append" ? activeChapter.content + html : html;
    updateChapter(book.id, activeChapter.id, { content: newContent });
  };

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const kbpMode = book ? isKbpEnabled(book) || book.template === "guidebook" : false;

  if (!hydrated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-cyan-400">Loading editor...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">Book not found</p>
        <button
          onClick={() => router.push("/")}
          className="text-cyan-400 hover:underline text-sm"
        >
          Back to library
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#121A2B]/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-white">{book.metadata.title}</h1>
            <p className="text-xs text-slate-500">
              {savedFlash ? (
                <span className="text-green-400">Saved</span>
              ) : (
                <>
                  Auto-saved · {book.chapters.length} chapters
                  {viewMode === "preview" && (
                    <span className="ml-2 text-amber-400/80">· Preview</span>
                  )}
                  {viewMode === "edit" && kbpMode && (
                    <span className="ml-2 text-fuchsia-400/80">· KBP</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-lg border border-white/10 p-0.5 mr-1">
            <button
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "edit"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Edit mode"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={() => {
                setViewMode("preview");
                setShowAI(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "preview"
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Print preview"
            >
              <Eye size={14} />
              Preview
            </button>
          </div>
          <button
            onClick={() => {
              exportBookJson(book);
              flashSaved();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5"
            title="Export project JSON"
          >
            <Save size={14} />
            Export
          </button>
          <button
            onClick={() => downloadEpub(book)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
          >
            <Download size={14} />
            EPUB
          </button>
          {kbpMode && (
            <button
              onClick={() => downloadKBP(book)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/30"
              title="Export KBP package for Kindle Direct Publishing"
            >
              <Download size={14} />
              KBP
            </button>
          )}
          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`p-2 rounded-lg transition-colors ${
              showProperties ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Book properties"
          >
            <Settings2 size={18} />
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            disabled={viewMode === "preview"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              showAI
                ? "bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300"
                : "bg-gradient-to-r from-fuchsia-600/80 to-purple-600/80 text-white hover:from-fuchsia-500 hover:to-purple-500"
            }`}
          >
            {showAI ? <PanelRightClose size={14} /> : <Sparkles size={14} />}
            AI
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="w-56 shrink-0">
          <ChapterSidebar
            chapters={book.chapters}
            activeChapterId={activeChapterId}
            onSelect={setActiveChapterId}
            onAddSection={(type) => {
              const newId = addSection(book.id, type);
              setActiveChapterId(newId);
              setViewMode("edit");
              flashSaved();
            }}
            onDelete={(id) => {
              deleteChapter(book.id, id);
              if (activeChapterId === id && book.chapters.length > 1) {
                const remaining = book.chapters.filter((ch) => ch.id !== id);
                setActiveChapterId(remaining[0]?.id || "");
              }
              flashSaved();
            }}
            onRename={(id, title) => {
              updateChapter(book.id, id, { title });
              flashSaved();
            }}
            onReorder={(id, dir) => {
              reorderChapter(book.id, id, dir);
              flashSaved();
            }}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 p-4">
          {activeChapter && (
            <>
              {viewMode === "edit" ? (
                <input
                  type="text"
                  value={activeChapter.title}
                  onChange={(e) => {
                    updateChapter(book.id, activeChapter.id, { title: e.target.value });
                    flashSaved();
                  }}
                  className="mb-3 bg-transparent text-xl font-semibold text-white outline-none border-b border-transparent focus:border-cyan-500/30 pb-1"
                  placeholder="Chapter title"
                />
              ) : (
                <p className="mb-3 text-sm text-amber-400/80 font-medium">
                  {activeChapter.title}
                </p>
              )}
              <div className="flex-1 min-h-0">
                {viewMode === "edit" ? (
                  <RichEditor
                    key={`edit-${activeChapter.id}`}
                    content={activeChapter.content}
                    onChange={handleContentChange}
                    placeholder="Start writing your chapter..."
                    kbpMode={kbpMode}
                  />
                ) : (
                  <PrintPreview
                    key={`preview-${activeChapter.id}`}
                    book={book}
                    chapterTitle={activeChapter.title}
                    chapterContent={activeChapter.content}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {showProperties && (
          <div className="w-64 shrink-0 border-l border-white/10 bg-[#121A2B]/60 overflow-y-auto">
            <MetadataPanel
              book={book}
              onUpdate={(metadata) => {
                updateMetadata(book.id, metadata);
                flashSaved();
              }}
              onUpdateKBP={(settings) => {
                updateKBPSettings(book.id, settings);
                flashSaved();
              }}
              onSetFormatProfile={(profile) => {
                setFormatProfile(book.id, profile);
                flashSaved();
              }}
            />
          </div>
        )}

        {showAI && activeChapter && viewMode === "edit" && (
          <div className="w-80 shrink-0">
            <AIAssistant
              chapterContent={activeChapter.content}
              bookTitle={book.metadata.title}
              onApply={handleAIApply}
              onClose={() => setShowAI(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
