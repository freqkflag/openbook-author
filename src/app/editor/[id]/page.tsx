"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Sparkles,
  PanelRightClose,
  Settings2,
  Save,
  Pencil,
  Eye,
  BookOpen,
  Image,
  FileDown,
  Keyboard,
} from "lucide-react";
import { useBookStore } from "@/store/book-store";
import ChapterSidebar from "@/components/ChapterSidebar";
import RichEditor from "@/components/RichEditor";
import PrintPreview from "@/components/PrintPreview";
import FullBookPreview from "@/components/FullBookPreview";
import AIAssistant from "@/components/AIAssistant";
import MetadataPanel from "@/components/MetadataPanel";
import AssetPanel from "@/components/AssetPanel";
import SaveStatusBadge from "@/components/SaveStatusBadge";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import { downloadEpub } from "@/lib/epub";
import { downloadPdf } from "@/lib/pdf-export";
import { downloadKBP } from "@/lib/kbp-export";
import { isKbpEnabled } from "@/lib/kbp";

type ViewMode = "edit" | "preview" | "full";

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
    reorderChapters,
    saveBookToDisk,
    openBookFromDisk,
    saveStatus,
    saveError,
    getAssetBlobs,
  } = useBookStore();

  const [activeChapterId, setActiveChapterId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [showAI, setShowAI] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

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

  const handleSave = useCallback(
    (saveAs = false) => {
      if (!book) return;
      saveBookToDisk(book.id, saveAs);
    },
    [book, saveBookToDisk]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave(false);
        return;
      }
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "?" && !isTyping && viewMode === "edit") {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, viewMode]);

  useEffect(() => {
    if (!window.openBook?.isElectron) return;
    const unsubOpen = window.openBook.onMenuOpen(() => {
      openBookFromDisk().then((id) => {
        if (id) router.push(`/editor/${id}`);
      });
    });
    const unsubSave = window.openBook.onMenuSave(() => handleSave(false));
    const unsubSaveAs = window.openBook.onMenuSaveAs(() => handleSave(true));
    return () => {
      unsubOpen();
      unsubSave();
      unsubSaveAs();
    };
  }, [handleSave, openBookFromDisk, router]);

  const handleContentChange = useCallback(
    (html: string) => {
      if (!book || !activeChapterId) return;
      updateChapter(book.id, activeChapterId, { content: html });
    },
    [book, activeChapterId, updateChapter]
  );

  const handleAIApply = (html: string, mode: "replace" | "append") => {
    if (!book || !activeChapter) return;
    const newContent = mode === "append" ? activeChapter.content + html : html;
    updateChapter(book.id, activeChapter.id, { content: newContent });
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
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white">{book.metadata.title}</h1>
              <SaveStatusBadge
                status={saveStatus}
                error={saveError}
                hasPackagePath={Boolean(book.packagePath)}
              />
            </div>
            <p className="text-xs text-slate-500">
              {book.chapters.length} chapters
              {book.packagePath && (
                <span className="text-slate-600">
                  {" · "}
                  {book.packagePath.split(/[/\\]/).pop()}
                </span>
              )}
              {viewMode !== "edit" && (
                <span className="ml-2 text-amber-400/80">
                  · {viewMode === "full" ? "Full preview" : "Preview"}
                </span>
              )}
              {viewMode === "edit" && kbpMode && (
                <span className="ml-2 text-fuchsia-400/80">· KBP</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-lg border border-white/10 p-0.5 mr-1">
            <button
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "preview"
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Chapter preview"
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              onClick={() => {
                setViewMode("full");
                setShowAI(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "full"
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Full book preview"
            >
              <BookOpen size={14} />
              Full
            </button>
          </div>

          <button
            onClick={() => handleSave(false)}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
            title="Save (Cmd+S)"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saveStatus === "saving"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
            title="Save As"
          >
            Save As
          </button>
          <button
            onClick={() => downloadEpub(book, getAssetBlobs(book.id))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
          >
            <Download size={14} />
            EPUB
          </button>
          <button
            onClick={() => downloadPdf(book, getAssetBlobs(book.id))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
            title="Export PDF via print dialog"
          >
            <FileDown size={14} />
            PDF
          </button>
          {kbpMode && (
            <button
              onClick={() => downloadKBP(book, getAssetBlobs(book.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/30"
              title="Export KBP package for Kindle Direct Publishing"
            >
              <Download size={14} />
              KBP
            </button>
          )}
          {viewMode === "edit" && (
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={18} />
            </button>
          )}
          <button
            onClick={() => {
              setShowAssets(!showAssets);
              if (!showAssets) setShowAI(false);
            }}
            className={`p-2 rounded-lg transition-colors ${
              showAssets ? "text-cyan-400 bg-cyan-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
            title="Asset manager"
          >
            <Image size={18} />
          </button>
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
            disabled={viewMode !== "edit"}
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
            }}
            onDelete={(id) => {
              deleteChapter(book.id, id);
              if (activeChapterId === id && book.chapters.length > 1) {
                const remaining = book.chapters.filter((ch) => ch.id !== id);
                setActiveChapterId(remaining[0]?.id || "");
              }
            }}
            onRename={(id, title) => updateChapter(book.id, id, { title })}
            onReorder={(id, dir) => reorderChapter(book.id, id, dir)}
            onReorderChapters={(from, to) => reorderChapters(book.id, from, to)}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 p-4">
          {viewMode === "full" ? (
            <FullBookPreview book={book} />
          ) : activeChapter ? (
            <>
              {viewMode === "edit" ? (
                <input
                  type="text"
                  value={activeChapter.title}
                  onChange={(e) => updateChapter(book.id, activeChapter.id, { title: e.target.value })}
                  className="mb-3 bg-transparent text-xl font-semibold text-white outline-none border-b border-transparent focus:border-cyan-500/30 pb-1"
                  placeholder="Chapter title"
                />
              ) : (
                <p className="mb-3 text-sm text-amber-400/80 font-medium">{activeChapter.title}</p>
              )}
              <div className="flex-1 min-h-0">
                {viewMode === "edit" ? (
                  <RichEditor
                    key={`edit-${activeChapter.id}`}
                    book={book}
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
          ) : null}
        </div>

        {showProperties && (
          <div className="w-64 shrink-0 border-l border-white/10 bg-[#121A2B]/60 overflow-y-auto">
            <MetadataPanel
              book={book}
              onUpdate={(metadata) => updateMetadata(book.id, metadata)}
              onUpdateKBP={(settings) => updateKBPSettings(book.id, settings)}
              onSetFormatProfile={(profile) => setFormatProfile(book.id, profile)}
            />
          </div>
        )}

        {showAssets && (
          <div className="w-72 shrink-0">
            <AssetPanel
              book={book}
              onClose={() => setShowAssets(false)}
              onInsert={(src, alt) => {
                if (viewMode === "edit" && activeChapter) {
                  const img = `<img src="${src}" alt="${alt || ""}" />`;
                  updateChapter(book.id, activeChapter.id, {
                    content: activeChapter.content + img,
                  });
                }
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
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
