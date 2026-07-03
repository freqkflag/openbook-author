"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  AISettings,
  Book,
  BookAsset,
  BookPart,
  BookTemplate,
  Chapter,
  ChapterSectionType,
  KBPSettings,
} from "@/types/book";
import { DEFAULT_KBP_SETTINGS, normalizeBookMetadata } from "@/types/book";
import { normalizeBookParts } from "@/lib/book-structure";
import type { ExportThemeSettings } from "@/types/book";
import { normalizeExportTheme } from "@/lib/export-themes";
import { getTemplate, getDefaultKbpForTemplate } from "@/lib/templates";
import { getSectionTemplate } from "@/lib/chapter-sections";
import { loadAISettings, loadBooks, saveAISettings, saveBooks } from "@/lib/storage";
import {
  assetPath,
  cacheAssetBlob,
  isAssetReferenced,
  uniqueFilename,
} from "@/lib/asset-store";
import { buildPackageZip, downloadPackage, parsePackageFile } from "@/lib/package-io";
import {
  buildFolderWritePayload,
  parseFolderContents,
  validateFolderProject,
} from "@/lib/folder-io";
import type { OpenBookProjectMeta } from "@/types/folder-project";
import { DEFAULT_PROJECT_META } from "@/types/folder-project";
import {
  getBookAssetBlobs,
  removeBookAssetBlobs,
  setAssetBlob,
  setBookAssetBlobs,
} from "@/lib/runtime-assets";

interface BookStore {
  books: Book[];
  currentBookId: string | null;
  aiSettings: AISettings;
  hydrated: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  lastSavedAt: string | null;

  hydrate: () => void;
  createBook: (template: BookTemplate, title?: string) => string;
  deleteBook: (id: string) => void;
  setCurrentBook: (id: string | null) => void;
  getCurrentBook: () => Book | undefined;
  getAssetBlobs: (bookId: string) => Map<string, Blob>;
  updateMetadata: (id: string, metadata: Partial<Book["metadata"]>) => void;
  updateKBPSettings: (id: string, settings: Partial<KBPSettings>) => void;
  updateExportTheme: (id: string, settings: Partial<ExportThemeSettings>) => void;
  setFormatProfile: (id: string, profile: Book["formatProfile"]) => void;
  addChapter: (bookId: string, title?: string) => string;
  addSection: (bookId: string, sectionType: ChapterSectionType) => string;
  addSectionFromTemplate: (
    bookId: string,
    title: string,
    content: string,
    sectionType?: ChapterSectionType
  ) => string;
  updateChapter: (bookId: string, chapterId: string, updates: Partial<Chapter>) => void;
  deleteChapter: (bookId: string, chapterId: string) => void;
  reorderChapter: (bookId: string, chapterId: string, direction: "up" | "down") => void;
  reorderChapters: (bookId: string, fromIndex: number, toIndex: number) => void;
  addPart: (bookId: string, title?: string) => string;
  updatePart: (bookId: string, partId: string, updates: Partial<Pick<BookPart, "title" | "chapterIds">>) => void;
  deletePart: (bookId: string, partId: string) => void;
  assignChapterToPart: (bookId: string, chapterId: string, partId: string | null) => void;
  reorderPart: (bookId: string, partId: string, direction: "up" | "down") => void;
  importBook: (book: Book | Omit<Book, "id" | "createdAt" | "updatedAt">) => string;
  importBookWithAssets: (
    book: Omit<Book, "id" | "createdAt" | "updatedAt">,
    assetBlobs: Map<string, Blob>
  ) => string;
  updateAISettings: (settings: Partial<AISettings>) => void;
  addAsset: (bookId: string, file: File) => Promise<BookAsset>;
  removeAsset: (bookId: string, assetId: string) => boolean;
  updateAsset: (bookId: string, assetId: string, updates: Partial<BookAsset>) => void;
  setCoverImage: (bookId: string, assetId: string | null) => void;
  saveBookToDisk: (bookId: string, saveAs?: boolean) => Promise<string | null>;
  openBookFromDisk: (file?: File) => Promise<string | null>;
  createFolderProject: (bookId: string, saveAs?: boolean) => Promise<string | null>;
  openFolderProject: () => Promise<string | null>;
  backupBookNow: (bookId: string) => Promise<string | null>;
  autoSave: (bookId: string) => void;
}

const defaultAISettings: AISettings = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  baseUrl: "",
  voiceProfile: "",
  styleGuide: "",
};

const autoSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function normalizeBook(b: Book): Book {
  return {
    ...b,
    metadata: normalizeBookMetadata(b.metadata),
    formatProfile: b.formatProfile ?? "standard",
    kbpSettings: b.kbpSettings ?? { ...DEFAULT_KBP_SETTINGS },
    exportTheme: normalizeExportTheme(b.exportTheme),
    assets: b.assets ?? [],
    packagePath: b.packagePath,
    projectPath: b.projectPath,
    storageMode: b.storageMode ?? (b.projectPath ? "folder" : b.packagePath ? "package" : undefined),
    chapters: b.chapters.map((ch) => ({
      ...ch,
      sectionType: ch.sectionType ?? "chapter",
    })),
    parts: normalizeBookParts(b.parts, b.chapters),
  };
}

async function writeBookPackage(
  book: Book,
  blobs: Map<string, Blob>,
  options: { saveAs?: boolean; path?: string } = {}
) {
  const zipBlob = await buildPackageZip(book, blobs);
  const buffer = await zipBlob.arrayBuffer();

  if (typeof window !== "undefined" && window.openBook?.writePackage) {
    let targetPath = options.saveAs ? undefined : options.path ?? book.packagePath;
    if (!targetPath) {
      const slug = (book.metadata.title || "book").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const chosen = await window.openBook.saveDialog(`${slug}.openbook`);
      if (!chosen) return null;
      targetPath = chosen;
    }
    await window.openBook.writePackage(targetPath, buffer);
    return targetPath;
  }

  downloadPackage(zipBlob, book.metadata.title);
  return "downloaded";
}

async function writeBookFolder(
  book: Book,
  blobs: Map<string, Blob>,
  options: {
    saveAs?: boolean;
    path?: string;
    projectMeta?: OpenBookProjectMeta;
  } = {}
) {
  if (!window.openBook?.writeFolderProject) return null;

  let targetPath = options.saveAs ? undefined : options.path ?? book.projectPath;
  if (!targetPath) {
    const slug = (book.metadata.title || "book").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const chosen = await window.openBook.createFolderDialog?.(slug);
    if (!chosen) return null;
    targetPath = chosen;
  }

  const meta: OpenBookProjectMeta = {
    ...DEFAULT_PROJECT_META,
    ...options.projectMeta,
    storageMode: "folder",
  };

  const payload = await buildFolderWritePayload(book, blobs, meta);
  await window.openBook.writeFolderProject(targetPath, payload);
  return targetPath;
}

async function persistBookToDisk(
  book: Book,
  blobs: Map<string, Blob>,
  options: { saveAs?: boolean } = {}
): Promise<string | null> {
  if (book.storageMode === "folder" || book.projectPath) {
    return writeBookFolder(book, blobs, {
      saveAs: options.saveAs,
      path: book.projectPath,
    });
  }
  return writeBookPackage(book, blobs, {
    saveAs: options.saveAs,
    path: book.packagePath,
  });
}

export const useBookStore = create<BookStore>((set, get) => {
  const persistBooks = (books: Book[]) => {
    saveBooks(books);
    set({ books, lastSavedAt: new Date().toISOString() });
  };

  const touchBook = (bookId: string, updater: (book: Book) => Book) => {
    const books = get().books.map((b) => (b.id === bookId ? updater(b) : b));
    persistBooks(books);
    get().autoSave(bookId);
    return books;
  };

  return {
    books: [],
    currentBookId: null,
    aiSettings: defaultAISettings,
    hydrated: false,
    saveStatus: "idle",
    saveError: null,
    lastSavedAt: null,

    hydrate: () => {
      if (get().hydrated) return;
      const rawBooks = loadBooks();
      const books = rawBooks.map(normalizeBook);
      const savedAI = loadAISettings();
      set({
        books,
        aiSettings: savedAI ? { ...defaultAISettings, ...savedAI } : defaultAISettings,
        hydrated: true,
      });
    },

    createBook: (template, title) => {
      const tpl = getTemplate(template);
      const id = uuidv4();
      const now = new Date().toISOString();
      const book: Book = {
        id,
        template,
        layoutMode: tpl.layoutMode,
        formatProfile: tpl.formatProfile ?? "standard",
        kbpSettings: getDefaultKbpForTemplate(template),
        exportTheme: normalizeExportTheme(
          template === "guidebook" ? { themeId: "guidebook" } : undefined
        ),
        assets: [],
        metadata: {
          title: title || "Untitled Book",
          subtitle: "",
          author: "",
          publisher: "OpenBook Author",
          language: "en",
          description: "",
        },
        chapters: tpl.sampleChapters.map((ch, i) => ({
          id: uuidv4(),
          title: ch.title,
          content: ch.content,
          order: i,
          sectionType: "chapter" as const,
        })),
        createdAt: now,
        updatedAt: now,
      };
      const books = [...get().books, book];
      persistBooks(books);
      set({ books, currentBookId: id });
      return id;
    },

    deleteBook: (id) => {
      removeBookAssetBlobs(id);
      const books = get().books.filter((b) => b.id !== id);
      persistBooks(books);
      set({
        books,
        currentBookId: get().currentBookId === id ? null : get().currentBookId,
      });
    },

    setCurrentBook: (id) => set({ currentBookId: id }),

    getCurrentBook: () => {
      const { books, currentBookId } = get();
      return books.find((b) => b.id === currentBookId);
    },

    getAssetBlobs: (bookId) => getBookAssetBlobs(bookId),

    updateMetadata: (id, metadata) => {
      touchBook(id, (b) => ({
        ...b,
        metadata: { ...b.metadata, ...metadata },
        updatedAt: new Date().toISOString(),
      }));
    },

    updateKBPSettings: (id, settings) => {
      touchBook(id, (b) => ({
        ...b,
        kbpSettings: { ...b.kbpSettings, ...settings },
        updatedAt: new Date().toISOString(),
      }));
    },

    updateExportTheme: (id, settings) => {
      touchBook(id, (b) => ({
        ...b,
        exportTheme: normalizeExportTheme({ ...b.exportTheme, ...settings }),
        updatedAt: new Date().toISOString(),
      }));
    },

    setFormatProfile: (id, profile) => {
      touchBook(id, (b) => ({
        ...b,
        formatProfile: profile,
        kbpSettings: { ...b.kbpSettings, enabled: profile === "kbp" },
        updatedAt: new Date().toISOString(),
      }));
    },

    addChapter: (bookId, title = "New Chapter") => {
      const newId = uuidv4();
      touchBook(bookId, (b) => ({
        ...b,
        chapters: [
          ...b.chapters,
          {
            id: newId,
            title,
            content: "<p></p>",
            order: b.chapters.length,
            sectionType: "chapter" as const,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
      return newId;
    },

    addSection: (bookId, sectionType) => {
      const tpl = getSectionTemplate(sectionType);
      const newId = uuidv4();
      touchBook(bookId, (b) => ({
        ...b,
        chapters: [
          ...b.chapters,
          {
            id: newId,
            title: tpl.defaultTitle,
            content: tpl.content,
            order: b.chapters.length,
            sectionType,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
      return newId;
    },

    addSectionFromTemplate: (bookId, title, content, sectionType = "chapter") => {
      const newId = uuidv4();
      touchBook(bookId, (b) => ({
        ...b,
        chapters: [
          ...b.chapters,
          {
            id: newId,
            title,
            content,
            order: b.chapters.length,
            sectionType,
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
      return newId;
    },

    updateChapter: (bookId, chapterId, updates) => {
      touchBook(bookId, (b) => ({
        ...b,
        chapters: b.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, ...updates } : ch
        ),
        updatedAt: new Date().toISOString(),
      }));
    },

    deleteChapter: (bookId, chapterId) => {
      touchBook(bookId, (b) => {
        const parts = b.parts?.map((part) => ({
          ...part,
          chapterIds: part.chapterIds.filter((id) => id !== chapterId),
        }));
        return {
          ...b,
          chapters: b.chapters
            .filter((ch) => ch.id !== chapterId)
            .map((ch, i) => ({ ...ch, order: i })),
          parts: normalizeBookParts(parts, b.chapters.filter((ch) => ch.id !== chapterId)),
          updatedAt: new Date().toISOString(),
        };
      });
    },

    reorderChapter: (bookId, chapterId, direction) => {
      touchBook(bookId, (b) => {
        const idx = b.chapters.findIndex((ch) => ch.id === chapterId);
        if (idx < 0) return b;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= b.chapters.length) return b;
        const chapters = [...b.chapters];
        [chapters[idx], chapters[swapIdx]] = [chapters[swapIdx], chapters[idx]];
        return {
          ...b,
          chapters: chapters.map((ch, i) => ({ ...ch, order: i })),
          updatedAt: new Date().toISOString(),
        };
      });
    },

    reorderChapters: (bookId, fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      touchBook(bookId, (b) => {
        if (fromIndex < 0 || fromIndex >= b.chapters.length) return b;
        if (toIndex < 0 || toIndex >= b.chapters.length) return b;
        const chapters = [...b.chapters];
        const [moved] = chapters.splice(fromIndex, 1);
        chapters.splice(toIndex, 0, moved);
        return {
          ...b,
          chapters: chapters.map((ch, i) => ({ ...ch, order: i })),
          updatedAt: new Date().toISOString(),
        };
      });
    },

    addPart: (bookId, title = "New Part") => {
      const newId = uuidv4();
      touchBook(bookId, (b) => {
        const parts = b.parts ?? [];
        return {
          ...b,
          parts: [
            ...parts,
            { id: newId, title, order: parts.length, chapterIds: [] },
          ],
          updatedAt: new Date().toISOString(),
        };
      });
      return newId;
    },

    updatePart: (bookId, partId, updates) => {
      touchBook(bookId, (b) => {
        if (!b.parts?.length) return b;
        const parts = b.parts.map((part) =>
          part.id === partId ? { ...part, ...updates } : part
        );
        return {
          ...b,
          parts: normalizeBookParts(parts, b.chapters),
          updatedAt: new Date().toISOString(),
        };
      });
    },

    deletePart: (bookId, partId) => {
      touchBook(bookId, (b) => ({
        ...b,
        parts: normalizeBookParts(
          b.parts?.filter((part) => part.id !== partId),
          b.chapters
        ),
        updatedAt: new Date().toISOString(),
      }));
    },

    assignChapterToPart: (bookId, chapterId, partId) => {
      touchBook(bookId, (b) => {
        const stripped = (b.parts ?? []).map((part) => ({
          ...part,
          chapterIds: part.chapterIds.filter((id) => id !== chapterId),
        }));

        if (!partId) {
          return {
            ...b,
            parts: normalizeBookParts(stripped, b.chapters),
            updatedAt: new Date().toISOString(),
          };
        }

        const parts = stripped.map((part) =>
          part.id === partId
            ? { ...part, chapterIds: [...part.chapterIds, chapterId] }
            : part
        );

        return {
          ...b,
          parts: normalizeBookParts(parts, b.chapters),
          updatedAt: new Date().toISOString(),
        };
      });
    },

    reorderPart: (bookId, partId, direction) => {
      touchBook(bookId, (b) => {
        if (!b.parts?.length) return b;
        const idx = b.parts.findIndex((part) => part.id === partId);
        if (idx < 0) return b;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= b.parts.length) return b;
        const parts = [...b.parts];
        [parts[idx], parts[swapIdx]] = [parts[swapIdx], parts[idx]];
        return {
          ...b,
          parts: parts.map((part, i) => ({ ...part, order: i })),
          updatedAt: new Date().toISOString(),
        };
      });
    },

    importBook: (book) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const fullBook = normalizeBook({
        ...book,
        id: "id" in book && book.id ? book.id : id,
        createdAt: "createdAt" in book && book.createdAt ? book.createdAt : now,
        updatedAt: now,
      } as Book);
      const books = [...get().books, fullBook];
      persistBooks(books);
      set({ books, currentBookId: fullBook.id });
      return fullBook.id;
    },

    importBookWithAssets: (book, assetBlobs) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const fullBook = normalizeBook({
        ...book,
        id,
        createdAt: now,
        updatedAt: now,
      });
      setBookAssetBlobs(fullBook.id, assetBlobs);
      for (const asset of fullBook.assets) {
        const blob = assetBlobs.get(asset.id);
        if (blob) cacheAssetBlob(asset.id, blob);
      }
      const books = [...get().books, fullBook];
      persistBooks(books);
      set({ books, currentBookId: fullBook.id });
      return fullBook.id;
    },

    updateAISettings: (settings) => {
      const aiSettings = { ...get().aiSettings, ...settings };
      saveAISettings(aiSettings);
      set({ aiSettings });
    },

    addAsset: async (bookId, file) => {
      const book = get().books.find((b) => b.id === bookId);
      if (!book) throw new Error("Book not found");

      const filename = uniqueFilename(book, file.name);
      const asset: BookAsset = {
        id: uuidv4(),
        filename,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        createdAt: new Date().toISOString(),
      };

      setAssetBlob(bookId, asset.id, file);
      cacheAssetBlob(asset.id, file);

      touchBook(bookId, (b) => ({
        ...b,
        assets: [...b.assets, asset],
        updatedAt: new Date().toISOString(),
      }));

      return asset;
    },

    removeAsset: (bookId, assetId) => {
      const book = get().books.find((b) => b.id === bookId);
      const asset = book?.assets.find((a) => a.id === assetId);
      if (!book || !asset) return false;
      if (isAssetReferenced(book, asset.filename)) return false;

      getBookAssetBlobs(bookId).delete(assetId);
      touchBook(bookId, (b) => ({
        ...b,
        assets: b.assets.filter((a) => a.id !== assetId),
        updatedAt: new Date().toISOString(),
      }));
      return true;
    },

    updateAsset: (bookId, assetId, updates) => {
      touchBook(bookId, (b) => ({
        ...b,
        assets: b.assets.map((a) => (a.id === assetId ? { ...a, ...updates } : a)),
        updatedAt: new Date().toISOString(),
      }));
    },

    setCoverImage: (bookId, assetId) => {
      const book = get().books.find((b) => b.id === bookId);
      if (!book) return;
      const path = assetId
        ? assetPath(book.assets.find((a) => a.id === assetId)?.filename ?? "")
        : undefined;
      touchBook(bookId, (b) => ({
        ...b,
        metadata: { ...b.metadata, coverImage: path },
        updatedAt: new Date().toISOString(),
      }));
    },

    saveBookToDisk: async (bookId, saveAs = false) => {
      const book = get().books.find((b) => b.id === bookId);
      if (!book) return null;

      set({ saveStatus: "saving", saveError: null });
      try {
        const blobs = getBookAssetBlobs(bookId);
        const filePath = await persistBookToDisk(book, blobs, { saveAs });
        if (!filePath) {
          set({ saveStatus: "idle" });
          return null;
        }
        if (filePath !== "downloaded") {
          const books = get().books.map((b) => {
            if (b.id !== bookId) return b;
            const updated = { ...b, updatedAt: new Date().toISOString() };
            if (b.storageMode === "folder" || b.projectPath) {
              return {
                ...updated,
                storageMode: "folder" as const,
                projectPath: filePath,
                packagePath: undefined,
              };
            }
            return {
              ...updated,
              storageMode: "package" as const,
              packagePath: filePath,
              projectPath: undefined,
            };
          });
          saveBooks(books);
          set({ books, saveStatus: "saved", lastSavedAt: new Date().toISOString() });
        } else {
          set({ saveStatus: "saved", lastSavedAt: new Date().toISOString() });
        }
        setTimeout(() => set({ saveStatus: "idle" }), 2000);
        return filePath;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";
        set({ saveStatus: "error", saveError: message });
        return null;
      }
    },

    openBookFromDisk: async (file) => {
      set({ saveStatus: "saving", saveError: null });
      try {
        let parsed;
        let packagePath: string | undefined;

        if (window.openBook?.isElectron && !file) {
          const filePath = await window.openBook.openDialog();
          if (!filePath) {
            set({ saveStatus: "idle" });
            return null;
          }
          const result = await window.openBook.readPackage(filePath);
          parsed = await parsePackageFile(new Blob([result.buffer]));
          packagePath = result.filePath;
        } else if (file) {
          parsed = await parsePackageFile(file);
        } else {
          set({ saveStatus: "idle" });
          return null;
        }

        const { book, assetBlobs } = parsed;
        const normalized = normalizeBook({
          ...book,
          id: uuidv4(),
          packagePath,
          updatedAt: new Date().toISOString(),
        });
        setBookAssetBlobs(normalized.id, assetBlobs);

        const books = [...get().books, normalized];
        persistBooks(books);
        set({ books, currentBookId: normalized.id, saveStatus: "saved" });
        setTimeout(() => set({ saveStatus: "idle" }), 2000);
        return normalized.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Open failed";
        set({ saveStatus: "error", saveError: message });
        return null;
      }
    },

    createFolderProject: async (bookId, saveAs = false) => {
      const book = get().books.find((b) => b.id === bookId);
      if (!book || !window.openBook?.writeFolderProject) return null;

      set({ saveStatus: "saving", saveError: null });
      try {
        const blobs = getBookAssetBlobs(bookId);
        const folderBook = { ...book, storageMode: "folder" as const };
        const filePath = await writeBookFolder(folderBook, blobs, {
          saveAs: true,
          path: saveAs ? undefined : book.projectPath,
        });
        if (!filePath) {
          set({ saveStatus: "idle" });
          return null;
        }
        const books = get().books.map((b) =>
          b.id === bookId
            ? {
                ...b,
                storageMode: "folder" as const,
                projectPath: filePath,
                packagePath: undefined,
                updatedAt: new Date().toISOString(),
              }
            : b
        );
        saveBooks(books);
        set({ books, saveStatus: "saved", lastSavedAt: new Date().toISOString() });
        setTimeout(() => set({ saveStatus: "idle" }), 2000);
        return filePath;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Folder project creation failed";
        set({ saveStatus: "error", saveError: message });
        return null;
      }
    },

    openFolderProject: async () => {
      if (!window.openBook?.readFolderProject || !window.openBook.openFolderDialog) {
        return null;
      }

      set({ saveStatus: "saving", saveError: null });
      try {
        const projectPath = await window.openBook.openFolderDialog();
        if (!projectPath) {
          set({ saveStatus: "idle" });
          return null;
        }

        const payload = await window.openBook.readFolderProject(projectPath);
        validateFolderProject(payload);
        const { book, assetBlobs } = parseFolderContents(payload);

        const normalized = normalizeBook({
          ...book,
          id: uuidv4(),
          storageMode: "folder",
          projectPath,
          packagePath: undefined,
          updatedAt: new Date().toISOString(),
        });
        setBookAssetBlobs(normalized.id, assetBlobs);

        const books = [...get().books, normalized];
        persistBooks(books);
        set({ books, currentBookId: normalized.id, saveStatus: "saved" });
        setTimeout(() => set({ saveStatus: "idle" }), 2000);
        return normalized.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Open folder failed";
        set({ saveStatus: "error", saveError: message });
        return null;
      }
    },

    backupBookNow: async (bookId) => {
      const book = get().books.find((b) => b.id === bookId);
      if (!book) return null;

      set({ saveStatus: "saving", saveError: null });
      try {
        const blobs = getBookAssetBlobs(bookId);
        const zipBlob = await buildPackageZip(book, blobs);
        const buffer = await zipBlob.arrayBuffer();
        const slug = (book.metadata.title || "book").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

        if (!window.openBook?.backupUpload) {
          throw new Error("Backup requires the Electron desktop app with Backup & Sync enabled");
        }

        const result = await window.openBook.backupUpload({
          bookId: book.id,
          slug,
          buffer,
          updatedAt: book.updatedAt,
        });
        set({ saveStatus: "saved", lastSavedAt: result.syncedAt });
        setTimeout(() => set({ saveStatus: "idle" }), 2000);
        return result.remotePath;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Backup failed";
        set({ saveStatus: "error", saveError: message });
        return null;
      }
    },

    autoSave: (bookId) => {
      const book = get().books.find((b) => b.id === bookId);
      if (!book) return;
      const hasDiskTarget =
        book.packagePath || book.projectPath || book.storageMode === "folder";
      if (!hasDiskTarget || (!window.openBook?.writePackage && !window.openBook?.writeFolderProject)) {
        return;
      }

      const existing = autoSaveTimers.get(bookId);
      if (existing) clearTimeout(existing);

      autoSaveTimers.set(
        bookId,
        setTimeout(() => {
          get().saveBookToDisk(bookId, false);
        }, 2000)
      );
    },
  };
});
