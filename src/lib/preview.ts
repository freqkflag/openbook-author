import type { Book } from "@/types/book";
import { isKbpEnabled } from "@/lib/kbp";
import { prepareChapterContent } from "@/lib/epub";

export function getPreviewHtml(book: Book, chapterContent: string, chapterTitle: string): string {
  const body = prepareChapterContent(book, chapterContent);
  const hasH1 = /<h1[\s>]/i.test(body);
  const titleBlock =
    chapterTitle && !hasH1
      ? `<h1 class="preview-chapter-title">${chapterTitle}</h1>`
      : "";
  return `${titleBlock}${body}`;
}

export function getPreviewMode(book: Book): "kbp" | "standard" {
  return isKbpEnabled(book) ? "kbp" : "standard";
}
