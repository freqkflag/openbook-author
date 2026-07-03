import {
  buildBookChunkIndex,
  buildPerChapterSnippets,
  formatChunksForPrompt,
  retrieveRelevantChunks,
  retrieveRelevantChunksWithEmbeddings,
  type OllamaEmbedConfig,
} from "@/lib/ai-rag";
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

export interface ConsistencyContextOptions {
  /** When true and ollama config is set, try local Ollama embeddings (Electron-friendly) */
  useEmbeddings?: boolean;
  ollama?: OllamaEmbedConfig;
  maxManuscriptChars?: number;
}

export interface ConsistencyContextResult {
  context: string;
  manuscript: string;
  scopeNote: string;
  ragMode: "keyword" | "embedding";
  chaptersScanned: number;
  chunksUsed: number;
}

const DEFAULT_MAX_MANUSCRIPT_CHARS = 10_000;

/** Assemble book-wide context for the consistency-check AI action */
export async function buildConsistencyCheckContext(
  book: Pick<Book, "metadata" | "chapters">,
  options: ConsistencyContextOptions = {}
): Promise<ConsistencyContextResult> {
  const maxChars = options.maxManuscriptChars ?? DEFAULT_MAX_MANUSCRIPT_CHARS;
  const chaptersWithContent = book.chapters.filter((ch) => stripHtml(ch.content).length > 0);
  const chunks = buildBookChunkIndex(book.chapters);

  let ragMode: "keyword" | "embedding" = "keyword";
  let retrieved = retrieveRelevantChunks(chunks, { topK: 14 });

  if (options.useEmbeddings && options.ollama?.baseUrl) {
    const embedded = await retrieveRelevantChunksWithEmbeddings(chunks, {
      topK: 14,
      ollama: options.ollama,
    });
    if (embedded.chunks.length > 0) {
      retrieved = embedded.chunks;
      ragMode = embedded.mode;
    }
  }

  const ragBlock = formatChunksForPrompt(retrieved);
  const snippets = buildPerChapterSnippets(book.chapters, 160);

  let manuscript = [
    "Retrieved passages (highest relevance for names, timeline, facts):",
    ragBlock,
    "",
    "Per-chapter snippets (full book overview):",
    snippets,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (manuscript.length > maxChars) {
    manuscript = `${manuscript.slice(0, maxChars).trim()}…\n\n[Manuscript truncated for model context limits.]`;
  }

  const contextParts = [
    `Book title: ${book.metadata.title}`,
    `Author: ${book.metadata.author || "Unknown"}`,
    `Sections with content: ${chaptersWithContent.length} of ${book.chapters.length}`,
  ];

  const toc = buildBookToc(book.chapters);
  if (toc) {
    contextParts.push(`Table of contents:\n${toc}`);
  }

  if (book.metadata.description.trim()) {
    contextParts.push(`Description: ${book.metadata.description.trim()}`);
  }

  const scopeNote =
    ragMode === "embedding"
      ? "Using local Ollama embeddings for semantic retrieval. Scans sampled excerpts — not every sentence."
      : "Using keyword retrieval (no embeddings). Scans sampled excerpts — not every sentence.";

  return {
    context: contextParts.join("\n\n"),
    manuscript,
    scopeNote,
    ragMode,
    chaptersScanned: chaptersWithContent.length,
    chunksUsed: retrieved.length,
  };
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
