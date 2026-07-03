import type { Book } from "@/types/book";

const BOOKS_KEY = "openbook-author-books";
const AI_SETTINGS_KEY = "openbook-author-ai";
const BOOKS_CRASH_BUFFER_KEY = "openbook-author-books-crash";

export function loadBooks(): Book[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKS_KEY);
    if (raw) return JSON.parse(raw) as Book[];
  } catch {
    // fall through to crash buffer
  }

  try {
    const crash = sessionStorage.getItem(BOOKS_CRASH_BUFFER_KEY);
    if (crash) return JSON.parse(crash) as Book[];
  } catch {
    return [];
  }

  return [];
}

export function saveBooks(books: Book[]): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(books);
  try {
    localStorage.setItem(BOOKS_KEY, payload);
    sessionStorage.removeItem(BOOKS_CRASH_BUFFER_KEY);
  } catch {
    try {
      sessionStorage.setItem(BOOKS_CRASH_BUFFER_KEY, payload);
    } catch {
      // Both storages failed — caller may surface save error
    }
  }
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

/** True when the last save fell back to sessionStorage crash buffer */
export function hasBooksCrashBuffer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(BOOKS_CRASH_BUFFER_KEY) !== null;
  } catch {
    return false;
  }
}
