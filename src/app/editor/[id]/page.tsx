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
  Image as ImageIcon,
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
import BookSearchModal from "@/components/BookSearchModal";
import PrintPdfModal from "@/components/PrintPdfModal";
import {
  downloadEpubWithValidation,
  formatPostExportValidationMessage,
} from "@/lib/epub-validation";
import { downloadPdf, type PrintPdfOptions } from "@/lib/pdf-export";
import { downloadKBP } from "@/lib/kbp-export";
import { downloadAudiobookManifest } from "@/lib/audiobook-export";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-roundtrip";
import FixedLayoutCanvas from "@/components/FixedLayoutCanvas";
import { DEFAULT_FIXED_SPREAD } from "@/types/fixed-layout";
import { isKbpEnabled } from "@/lib/kbp";
import { adjacentChapterId, isEditableTarget } from "@/lib/keyboard-shortcuts";
import {
  assessPublishReadiness,
  formatReadinessExportWarning,
} from "@/lib/publish-readiness";
import { saveUserSectionTemplate } from "@/lib/section-template-store";
import type { UserSectionTemplate } from "@/lib/section-template-store";

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
    updateExportTheme,
    setFormatProfile,
    addSection,
    addSectionFromTemplate,
    updateChapter,
    deleteChapter,
    reorderChapter,
    reorderChapters,
    addPart,
    updatePart,
    deletePart,
    assignChapterToPart,
    reorderPart,
    saveBookToDisk,
    openBookFromDisk,
    openFolderProject,
    createFolderProject,
    backupBookNow,
    saveStatus,
    saveError,
    lastSavedAt,
    getAssetBlobs,
  } = useBookStore();

  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [showAI, setShowAI] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPrintPdf, setShowPrintPdf] = useState(false);
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (bookId) setCurrentBook(bookId);
  }, [bookId, setCurrentBook]);

  const book = books.find((b) => b.id === bookId);
  const activeChapterId =
    selectedChapterId && book?.chapters.some((ch) => ch.id === selectedChapterId)
      ? selectedChapterId
      : (book?.chapters[0]?.id ?? "");
  const activeChapter = book?.chapters.find((ch) => ch.id === activeChapterId);

  const handleSave = useCallback(
    (saveAs = false) => {
      if (!book) return;
      saveBookToDisk(book.id, saveAs);
    },
    [book, saveBookToDisk]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSave(false);
        return;
      }

      if (mod && e.key.toLowerCase() === "p" && e.shiftKey) {
        e.preventDefault();
        setViewMode((mode) => (mode === "full" ? "edit" : "full"));
        setShowAI(false);
        return;
      }

      if (mod && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        setViewMode((mode) => (mode === "edit" ? "preview" : "edit"));
        setShowAI(false);
        return;
      }

      if (mod && e.key.toLowerCase() === "f" && e.shiftKey) {
        e.preventDefault();
        setShowSearch(true);
        return;
      }

      if (mod && e.key === "/") {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (isEditableTarget(e.target)) return;

      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      if (mod && e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        if (!book) return;
        const nextId = adjacentChapterId(
          book.chapters,
          activeChapterId,
          e.key === "ArrowUp" ? "prev" : "next"
        );
        if (nextId) {
          setSelectedChapterId(nextId);
          setViewMode("edit");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, book, activeChapterId]);

  useEffect(() => {
    if (!window.openBook?.isElectron) return;
    const unsubOpen = window.openBook.onMenuOpen(() => {
      openBookFromDisk().then((id) => {
        if (id) router.push(`/editor/${id}`);
      });
    });
    const unsubOpenFolder = window.openBook.onMenuOpenFolder?.(() => {
      openFolderProject().then((id) => {
        if (id) router.push(`/editor/${id}`);
      });
    });
    const unsubSave = window.openBook.onMenuSave(() => handleSave(false));
    const unsubSaveAs = window.openBook.onMenuSaveAs(() => handleSave(true));
    return () => {
      unsubOpen();
      unsubOpenFolder?.();
      unsubSave();
      unsubSaveAs();
    };
  }, [handleSave, openBookFromDisk, openFolderProject, router]);

  const handleContentChange = useCallback(
    (html: string) => {
      if (!book || !activeChapterId) return;
      updateChapter(book.id, activeChapterId, { content: html });
    },
    [book, activeChapterId, updateChapter]
  );

  const handleSaveAsTemplate = useCallback((chapter: NonNullable<typeof activeChapter>) => {
    const name = window.prompt("Template name", chapter.title);
    if (!name?.trim()) return;

    saveUserSectionTemplate({
      name: name.trim(),
      description: `Saved from “${chapter.title}”`,
      defaultTitle: chapter.title,
      content: chapter.content,
      sectionType: chapter.sectionType ?? "chapter",
    });
    window.alert("Section saved to My templates.");
  }, []);

  const handleAddCustomTemplate = useCallback(
    (template: UserSectionTemplate) => {
      if (!book) return;
      const newId = addSectionFromTemplate(
        book.id,
        template.defaultTitle,
        template.content,
        template.sectionType
      );
      setSelectedChapterId(newId);
      setViewMode("edit");
    },
    [book, addSectionFromTemplate]
  );

  const handleApplySearchReplacements = useCallback(
    (updates: { chapterId: string; content: string }[]) => {
      if (!book) return;
      for (const update of updates) {
        updateChapter(book.id, update.chapterId, { content: update.content });
      }
    },
    [book, updateChapter]
  );

  const handleAIApply = (html: string, mode: "replace" | "append") => {
    if (!book || !activeChapter) return;
    const newContent = mode === "append" ? activeChapter.content + html : html;
    updateChapter(book.id, activeChapter.id, { content: newContent });
  };

  const handleAIGenerateSection = useCallback(
    (title: string, content: string) => {
      if (!book) return;
      const newId = addSectionFromTemplate(book.id, title, content);
      setSelectedChapterId(newId);
      setViewMode("edit");
      setShowAI(false);
    },
    [book, addSectionFromTemplate]
  );

  const confirmExportIfNeeded = useCallback((targetBook: typeof book) => {
    if (!targetBook) return false;
    const report = assessPublishReadiness(targetBook);
    if (report.errorCount === 0) return true;
    return window.confirm(formatReadinessExportWarning(report));
  }, []);

  const handleExportEpub = useCallback(async () => {
    if (!book || !confirmExportIfNeeded(book)) return;
    const filename = `${book.metadata.title || "book"}.epub`;
    try {
      const result = await downloadEpubWithValidation(book, getAssetBlobs(book.id));
      const message = formatPostExportValidationMessage(result, filename);
      if (result.issues.length > 0) {
        window.alert(message);
      }
    } catch {
      window.alert(`EPUB export failed for "${filename}". Try again or check Publish Readiness.`);
    }
  }, [book, confirmExportIfNeeded, getAssetBlobs]);

  const handleExportPdf = useCallback(
    async (options: PrintPdfOptions) => {
      if (!book || !confirmExportIfNeeded(book)) return;
      await downloadPdf(book, getAssetBlobs(book.id), options);
    },
    [book, confirmExportIfNeeded, getAssetBlobs]
  );

  const handleOpenPrintPdf = useCallback(() => {
    if (!book || !confirmExportIfNeeded(book)) return;
    setShowPrintPdf(true);
  }, [book, confirmExportIfNeeded]);

  const handleExportAudiobook = useCallback(() => {
    if (!book || !confirmExportIfNeeded(book)) return;
    void downloadAudiobookManifest(book, getAssetBlobs(book.id));
  }, [book, confirmExportIfNeeded, getAssetBlobs]);

  const handleExportKBP = useCallback(() => {
    if (!book || !confirmExportIfNeeded(book)) return;
    downloadKBP(book, getAssetBlobs(book.id));
  }, [book, confirmExportIfNeeded, getAssetBlobs]);

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
                hasPackagePath={Boolean(book.packagePath || book.projectPath)}
                lastSavedAt={lastSavedAt}
              />
            </div>
            <p className="text-xs text-slate-500">
              {book.chapters.length} chapters
              {(book.packagePath || book.projectPath) && (
                <span className="text-slate-600">
                  {" · "}
                  {(book.projectPath || book.packagePath)?.split(/[/\\]/).pop()}
                  {book.storageMode === "folder" || book.projectPath ? " (folder)" : ""}
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
              title="Chapter preview (⌘P)"
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
              title="Full book preview (⌘⇧P)"
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
            onClick={handleExportEpub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
          >
            <Download size={14} />
            EPUB
          </button>
          <button
            onClick={handleOpenPrintPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
            title="Export PDF with trim size presets"
          >
            <FileDown size={14} />
            PDF
          </button>
          <button
            onClick={handleExportAudiobook}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30"
            title="Export W3C Audiobook manifest (LPF)"
          >
            <Download size={14} />
            Audiobook
          </button>
          {kbpMode && (
            <button
              onClick={handleExportKBP}
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
              title="Keyboard shortcuts (⌘/)"
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
            <ImageIcon size={18} aria-hidden="true" />
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
            parts={book.parts}
            activeChapterId={activeChapterId}
            onSelect={setSelectedChapterId}
            onAddSection={(type) => {
              const newId = addSection(book.id, type);
              setSelectedChapterId(newId);
              setViewMode("edit");
            }}
            onAddCustomTemplate={handleAddCustomTemplate}
            onSaveAsTemplate={handleSaveAsTemplate}
            onDelete={(id) => {
              deleteChapter(book.id, id);
              if (activeChapterId === id && book.chapters.length > 1) {
                const remaining = book.chapters.filter((ch) => ch.id !== id);
                setSelectedChapterId(remaining[0]?.id || "");
              }
            }}
            onRename={(id, title) => updateChapter(book.id, id, { title })}
            onReorder={(id, dir) => reorderChapter(book.id, id, dir)}
            onReorderChapters={(from, to) => reorderChapters(book.id, from, to)}
            onAddPart={() => addPart(book.id)}
            onRenamePart={(partId, title) => updatePart(book.id, partId, { title })}
            onDeletePart={(partId) => deletePart(book.id, partId)}
            onReorderPart={(partId, dir) => reorderPart(book.id, partId, dir)}
            onAssignChapterToPart={(chapterId, partId) =>
              assignChapterToPart(book.id, chapterId, partId)
            }
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
                <>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeChapter) return;
                        if (!markdownMode) {
                          setMarkdownDraft(htmlToMarkdown(activeChapter.content));
                          setMarkdownMode(true);
                        } else {
                          updateChapter(book.id, activeChapter.id, {
                            content: markdownToHtml(markdownDraft),
                          });
                          setMarkdownMode(false);
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs border ${
                        markdownMode
                          ? "border-cyan-500/40 text-cyan-300"
                          : "border-white/10 text-slate-400"
                      }`}
                    >
                      {markdownMode ? "Apply Markdown" : "Markdown mode"}
                    </button>
                    {book.layoutMode === "landscape" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeChapter) return;
                          const isFixed = activeChapter.editorMode === "fixed";
                          updateChapter(book.id, activeChapter.id, {
                            editorMode: isFixed ? "reflow" : "fixed",
                            fixedSpread: isFixed ? undefined : activeChapter.fixedSpread ?? DEFAULT_FIXED_SPREAD,
                          });
                        }}
                        className={`px-2 py-1 rounded text-xs border ${
                          activeChapter.editorMode === "fixed"
                            ? "border-purple-500/40 text-purple-300"
                            : "border-white/10 text-slate-400"
                        }`}
                      >
                        {activeChapter.editorMode === "fixed" ? "Reflow mode" : "Fixed spread"}
                      </button>
                    )}
                  </div>
                  {markdownMode ? (
                    <textarea
                      value={markdownDraft}
                      onChange={(e) => setMarkdownDraft(e.target.value)}
                      className="flex-1 min-h-[320px] w-full bg-[#0B1020] border border-white/10 rounded-xl p-4 font-mono text-sm text-slate-200"
                      placeholder="# Chapter in Markdown"
                    />
                  ) : activeChapter.editorMode === "fixed" ? (
                    <FixedLayoutCanvas
                      spread={activeChapter.fixedSpread ?? DEFAULT_FIXED_SPREAD}
                      onChange={(spread) =>
                        updateChapter(book.id, activeChapter.id, { fixedSpread: spread })
                      }
                    />
                  ) : (
                    <RichEditor
                      key={`edit-${activeChapter.id}`}
                      book={book}
                      content={activeChapter.content}
                      onChange={handleContentChange}
                      placeholder="Start writing your chapter..."
                      kbpMode={kbpMode}
                      onShowShortcuts={() => setShowShortcuts(true)}
                    />
                  )}
                </>
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
              onUpdateExportTheme={(settings) => updateExportTheme(book.id, settings)}
              onSetFormatProfile={(profile) => setFormatProfile(book.id, profile)}
              onNavigateToChapter={(chapterId) => {
                setSelectedChapterId(chapterId);
                setViewMode("edit");
              }}
              onCreateFolderProject={() => void createFolderProject(book.id)}
              onBackupNow={() => backupBookNow(book.id)}
              activeChapterId={activeChapterId}
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
              book={book}
              currentChapterId={activeChapter.id}
              onApply={handleAIApply}
              onGenerateSection={handleAIGenerateSection}
              onClose={() => setShowAI(false)}
            />
          </div>
        )}
      </div>
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <BookSearchModal
        open={showSearch}
        chapters={book.chapters}
        activeChapterId={activeChapterId}
        onClose={() => setShowSearch(false)}
        onSelectChapter={(chapterId) => {
          setSelectedChapterId(chapterId);
          setViewMode("edit");
        }}
        onApplyReplacements={handleApplySearchReplacements}
      />
      <PrintPdfModal
        open={showPrintPdf}
        onClose={() => setShowPrintPdf(false)}
        onExport={handleExportPdf}
      />
    </div>
  );
}
