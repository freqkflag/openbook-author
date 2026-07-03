"use client";

import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { AISettings, Book, BookTemplate, Chapter, ChapterSectionType, KBPSettings } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { getTemplate, getDefaultKbpForTemplate } from "@/lib/templates";
import { getSectionTemplate } from "@/lib/chapter-sections";
import { loadAISettings, loadBooks, saveAISettings, saveBooks } from "@/lib/storage";

interface BookStore {
  books: Book[];
  currentBookId: string | null;
  aiSettings: AISettings;
  hydrated: boolean;

  hydrate: () => void;
  createBook: (template: BookTemplate, title?: string) => string;
  deleteBook: (id: string) => void;
  setCurrentBook: (id: string | null) => void;
  getCurrentBook: () => Book | undefined;
  updateMetadata: (id: string, metadata: Partial<Book["metadata"]>) => void;
  updateKBPSettings: (id: string, settings: Partial<KBPSettings>) => void;
  setFormatProfile: (id: string, profile: Book["formatProfile"]) => void;
  addChapter: (bookId: string, title?: string) => string;
  addSection: (bookId: string, sectionType: ChapterSectionType) => string;
  updateChapter: (bookId: string, chapterId: string, updates: Partial<Chapter>) => void;
  deleteChapter: (bookId: string, chapterId: string) => void;
  reorderChapter: (bookId: string, chapterId: string, direction: "up" | "down") => void;
  importBook: (book: Book | Omit<Book, "id" | "createdAt" | "updatedAt">) => string;
  updateAISettings: (settings: Partial<AISettings>) => void;
}

const defaultAISettings: AISettings = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  baseUrl: "",
};

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  currentBookId: null,
  aiSettings: defaultAISettings,
  hydrated: false,

  hydrate: () => {
    const rawBooks = loadBooks();
    const books = rawBooks.map((b) => ({
      ...b,
      formatProfile: b.formatProfile ?? "standard",
      kbpSettings: b.kbpSettings ?? { ...DEFAULT_KBP_SETTINGS },
      chapters: b.chapters.map((ch) => ({
        ...ch,
        sectionType: ch.sectionType ?? "chapter",
      })),
    }));
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
    saveBooks(books);
    set({ books, currentBookId: id });
    return id;
  },

  deleteBook: (id) => {
    const books = get().books.filter((b) => b.id !== id);
    saveBooks(books);
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

  updateMetadata: (id, metadata) => {
    const books = get().books.map((b) =>
      b.id === id
        ? { ...b, metadata: { ...b.metadata, ...metadata }, updatedAt: new Date().toISOString() }
        : b
    );
    saveBooks(books);
    set({ books });
  },

  updateKBPSettings: (id, settings) => {
    const books = get().books.map((b) =>
      b.id === id
        ? {
            ...b,
            kbpSettings: { ...b.kbpSettings, ...settings },
            updatedAt: new Date().toISOString(),
          }
        : b
    );
    saveBooks(books);
    set({ books });
  },

  setFormatProfile: (id, profile) => {
    const books = get().books.map((b) =>
      b.id === id
        ? {
            ...b,
            formatProfile: profile,
            kbpSettings: {
              ...b.kbpSettings,
              enabled: profile === "kbp",
            },
            updatedAt: new Date().toISOString(),
          }
        : b
    );
    saveBooks(books);
    set({ books });
  },

  addChapter: (bookId, title = "New Chapter") => {
    const newId = uuidv4();
    const books = get().books.map((b) => {
      if (b.id !== bookId) return b;
      const order = b.chapters.length;
      return {
        ...b,
        chapters: [
          ...b.chapters,
          { id: newId, title, content: "<p></p>", order, sectionType: "chapter" as const },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    saveBooks(books);
    set({ books });
    return newId;
  },

  addSection: (bookId, sectionType) => {
    const tpl = getSectionTemplate(sectionType);
    const newId = uuidv4();
    const books = get().books.map((b) => {
      if (b.id !== bookId) return b;
      const order = b.chapters.length;
      return {
        ...b,
        chapters: [
          ...b.chapters,
          {
            id: newId,
            title: tpl.defaultTitle,
            content: tpl.content,
            order,
            sectionType,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    saveBooks(books);
    set({ books });
    return newId;
  },

  updateChapter: (bookId, chapterId, updates) => {
    const books = get().books.map((b) => {
      if (b.id !== bookId) return b;
      return {
        ...b,
        chapters: b.chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, ...updates } : ch
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    saveBooks(books);
    set({ books });
  },

  deleteChapter: (bookId, chapterId) => {
    const books = get().books.map((b) => {
      if (b.id !== bookId) return b;
      const chapters = b.chapters
        .filter((ch) => ch.id !== chapterId)
        .map((ch, i) => ({ ...ch, order: i }));
      return { ...b, chapters, updatedAt: new Date().toISOString() };
    });
    saveBooks(books);
    set({ books });
  },

  reorderChapter: (bookId, chapterId, direction) => {
    const books = get().books.map((b) => {
      if (b.id !== bookId) return b;
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
    saveBooks(books);
    set({ books });
  },

  importBook: (book) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const fullBook: Book = {
      ...book,
      id: "id" in book && book.id ? book.id : id,
      formatProfile: book.formatProfile ?? "standard",
      kbpSettings: book.kbpSettings ?? { ...DEFAULT_KBP_SETTINGS },
      createdAt: "createdAt" in book && book.createdAt ? book.createdAt : now,
      updatedAt: now,
    };
    if (!fullBook.id) fullBook.id = id;
    const books = [...get().books, fullBook];
    saveBooks(books);
    set({ books, currentBookId: fullBook.id });
    return fullBook.id;
  },

  updateAISettings: (settings) => {
    const aiSettings = { ...get().aiSettings, ...settings };
    saveAISettings(aiSettings);
    set({ aiSettings });
  },
}));
