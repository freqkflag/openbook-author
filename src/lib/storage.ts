import type { Book } from "@/types/book";

const BOOKS_KEY = "openbook-author-books";
const AI_SETTINGS_KEY = "openbook-author-ai";

export function loadBooks(): Book[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKS_KEY);
    return raw ? (JSON.parse(raw) as Book[]) : [];
  } catch {
    return [];
  }
}

export function saveBooks(books: Book[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export function loadAISettings() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAISettings(settings: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}
