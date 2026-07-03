"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  Sparkles,
  LayoutTemplate,
  Clock,
  FileArchive,
  FolderOpen,
} from "lucide-react";
import { useBookStore } from "@/store/book-store";
import { TEMPLATES } from "@/lib/templates";
import { importIBAFile, type IBAImportDiagnostics } from "@/lib/iba-import";
import { importEpubFile } from "@/lib/epub-import";
import { importDocxFile } from "@/lib/docx-import";
import ImportDiagnosticsModal from "@/components/ImportDiagnosticsModal";
import type { Book, BookTemplate } from "@/types/book";

export default function Dashboard() {
  const router = useRouter();
  const { books, hydrated, hydrate, createBook, deleteBook, importBook, importBookWithAssets, openBookFromDisk, openFolderProject } = useBookStore();
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [ibaDiagnostics, setIbaDiagnostics] = useState<IBAImportDiagnostics | null>(null);
  const [ibaImportBookId, setIbaImportBookId] = useState<string | null>(null);
  const [ibaImportTitle, setIbaImportTitle] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleCreate = (template: BookTemplate) => {
    const id = createBook(template, newTitle || undefined);
    setShowTemplates(false);
    setNewTitle("");
    router.push(`/editor/${id}`);
  };

  const handleOpenFolder = () => {
    if (!window.openBook?.isElectron) {
      alert("Folder projects require the Electron desktop app.");
      return;
    }
    openFolderProject().then((id) => {
      if (id) router.push(`/editor/${id}`);
    });
  };

  const handleOpenBook = () => {
    if (window.openBook?.isElectron) {
      openBookFromDisk().then((id) => {
        if (id) router.push(`/editor/${id}`);
      });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".openbook";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const id = await openBookFromDisk(file);
        if (id) router.push(`/editor/${id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to open package");
      }
    };
    input.click();
  };

  const handleImportEPUB = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".epub,application/epub+zip";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const { book, assetBlobs, warnings } = await importEpubFile(file);
        const id = importBookWithAssets(book, assetBlobs);
        setImportWarnings(warnings);
        router.push(`/editor/${id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to import EPUB");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleImportDOCX = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const { book, assetBlobs, warnings } = await importDocxFile(file);
        const id = importBookWithAssets(book, assetBlobs);
        setImportWarnings(warnings);
        router.push(`/editor/${id}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to import DOCX");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleImportIBA = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".iba,.book,.ibatemplate,.booktemplate";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const { book, warnings, diagnostics } = await importIBAFile(file);
        const id = importBook(book);
        setImportWarnings(warnings);
        setIbaDiagnostics(diagnostics);
        setIbaImportBookId(id);
        setIbaImportTitle(book.metadata.title);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to import IBA file");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.openbook.json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const book = JSON.parse(text) as Book;
        importBook(book);
      } catch {
        alert("Invalid book file");
      }
    };
    input.click();
  };

  if (!hydrated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-cyan-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-white/10 bg-[#121A2B]/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                OpenBook Author
              </h1>
              <p className="mt-2 text-slate-400 text-sm max-w-lg">
                A modern, free &amp; open-source book authoring studio. Create interactive EPUB books
                with AI-powered writing assistance — your FOSS alternative to iBooks Author.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={handleOpenBook}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-500/10 transition-colors"
              >
                <FolderOpen size={16} />
                Open Book
              </button>
              {typeof window !== "undefined" && window.openBook?.isElectron && (
                <button
                  onClick={handleOpenFolder}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/30 text-green-300 text-sm hover:bg-green-500/10 transition-colors"
                >
                  <FolderOpen size={16} />
                  Open Folder
                </button>
              )}
              <button
                onClick={handleImportEPUB}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 text-sm hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
              >
                <BookOpen size={16} />
                {importing ? "Importing..." : "Import EPUB"}
              </button>
              <button
                onClick={handleImportDOCX}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500/30 text-green-300 text-sm hover:bg-green-500/10 transition-colors disabled:opacity-50"
              >
                <FileArchive size={16} />
                {importing ? "Importing..." : "Import DOCX"}
              </button>
              <button
                onClick={handleImportIBA}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-500/10 transition-colors disabled:opacity-50"
              >
                <FileArchive size={16} />
                {importing ? "Importing..." : "Import IBA"}
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors"
              >
                <Upload size={16} />
                Import JSON
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white text-sm font-medium hover:from-cyan-400 hover:to-fuchsia-400 transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)]"
              >
                <Plus size={16} />
                New Book
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 rounded-2xl bg-[#121A2B]/60 border border-white/10 mb-6">
              <BookOpen size={48} className="text-cyan-400/60" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No books yet</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md">
              Create your first book from a template, or open an existing `.openbook` package.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleOpenBook}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <FolderOpen size={18} />
                Open Book
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white font-medium hover:from-cyan-400 hover:to-fuchsia-400 transition-all"
              >
                <LayoutTemplate size={18} />
                Choose a Template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="group relative rounded-xl border border-white/10 bg-[#121A2B]/60 backdrop-blur-sm hover:border-cyan-500/30 transition-all hover:shadow-[0_0_30px_rgba(0,229,255,0.1)]"
              >
                <button
                  onClick={() => router.push(`/editor/${book.id}`)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <BookOpen size={20} className="text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white truncate">
                        {book.metadata.title}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {book.metadata.author || "No author"} · {book.chapters.length} chapters
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="capitalize px-2 py-0.5 rounded bg-white/5">
                      {book.template}
                    </span>
                    {book.packagePath || book.projectPath ? (
                      <span
                        className="text-cyan-500/70 truncate max-w-[120px]"
                        title={book.projectPath || book.packagePath}
                      >
                        {book.storageMode === "folder" || book.projectPath ? "Folder" : "On disk"}
                      </span>
                    ) : (
                      <span className="text-amber-500/70">Unsaved</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(book.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${book.metadata.title}"?`)) deleteBook(book.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 rounded-xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-cyan-500/5">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="text-fuchsia-400" size={20} />
            <h3 className="font-semibold text-white">AI Writing Assistant</h3>
          </div>
          <p className="text-sm text-slate-400">
            Every book includes an integrated AI panel. Continue writing, improve prose, generate
            outlines, and more — powered by OpenAI, Anthropic, or local Ollama models. Your API keys
            stay in your browser.
          </p>
        </div>

        {importWarnings.length > 0 && (
          <div className="mt-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
            <h4 className="text-sm font-medium text-yellow-400 mb-2">Import notes</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              {importWarnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <ImportDiagnosticsModal
        open={ibaDiagnostics !== null && ibaImportBookId !== null}
        sourceLabel="IBA"
        bookTitle={ibaImportTitle}
        diagnostics={ibaDiagnostics}
        onClose={() => {
          setIbaDiagnostics(null);
          setIbaImportBookId(null);
        }}
        onContinue={() => {
          if (ibaImportBookId) router.push(`/editor/${ibaImportBookId}`);
          setIbaDiagnostics(null);
          setIbaImportBookId(null);
        }}
      />

      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121A2B] shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Choose a Template</h2>
              <p className="text-sm text-slate-400 mt-1">
                Inspired by iBooks Author — portrait, landscape, and textbook layouts.
              </p>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Book title (optional)"
                className="mt-3 w-full bg-[#0B1020] border border-white/10 rounded-lg px-4 py-2 text-sm text-white"
              />
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleCreate(tpl.id)}
                  className="text-left p-4 rounded-xl border border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group"
                >
                  <h3 className="font-medium text-white group-hover:text-cyan-300">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
                  <span className="inline-block mt-2 text-xs text-cyan-500/70 capitalize">
                    {tpl.layoutMode} layout
                  </span>
                </button>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowTemplates(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
