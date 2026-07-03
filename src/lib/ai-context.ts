import type { Book, Chapter } from "@/types/book";

const EXCERPT_MAX_CHARS = 400;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text: string, maxChars = EXCERPT_MAX_CHARS): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}…`;
}

/** Build table-of-contents lines from chapter titles in order */
export function buildBookToc(chapters: Chapter[]): string {
  return chapters
    .filter((ch) => ch.title.trim())
    .map((ch, i) => `${i + 1}. ${ch.title.trim()}`)
    .join("\n");
}

/** Excerpts from chapters that appear before the active chapter */
export function buildPriorChapterExcerpts(
  chapters: Chapter[],
  currentChapterId: string
): string {
  const currentIndex = chapters.findIndex((ch) => ch.id === currentChapterId);
  const prior = currentIndex > 0 ? chapters.slice(0, currentIndex) : [];

  return prior
    .map((ch) => {
      const body = excerpt(stripHtml(ch.content));
      if (!body) return null;
      return `### ${ch.title.trim()}\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Full book-aware context string for AI requests */
export function buildBookAIContext(
  book: Pick<Book, "metadata" | "chapters">,
  currentChapterId: string
): string {
  const parts: string[] = [
    `Book title: ${book.metadata.title}`,
    `Author: ${book.metadata.author || "Unknown"}`,
  ];

  if (book.metadata.description.trim()) {
    parts.push(`Description: ${book.metadata.description.trim()}`);
  }

  const toc = buildBookToc(book.chapters);
  if (toc) {
    parts.push(`Table of contents:\n${toc}`);
  }

  const current = book.chapters.find((ch) => ch.id === currentChapterId);
  if (current) {
    parts.push(`Current section: ${current.title}`);
  }

  const prior = buildPriorChapterExcerpts(book.chapters, currentChapterId);
  if (prior) {
    parts.push(`Prior section excerpts:\n${prior}`);
  }

  return parts.join("\n\n");
}

/** Parse AI-generated section HTML into title + body */
export function parseGeneratedSectionHtml(html: string): { title: string; content: string } {
  const trimmed = html.trim();
  const h1Match = trimmed.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? stripHtml(h1Match[1]) : "New Section";
  const content = h1Match
    ? trimmed.replace(h1Match[0], "").trim() || "<p></p>"
    : trimmed || "<p></p>";
  return { title: title || "New Section", content };
}
