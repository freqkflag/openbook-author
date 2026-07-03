import type { Chapter } from "@/types/book";

export interface TextChunk {
  id: string;
  chapterId: string;
  chapterTitle: string;
  text: string;
}

export interface RagRetrievalOptions {
  topK?: number;
  queries?: string[];
}

export interface OllamaEmbedConfig {
  baseUrl: string;
  model?: string;
}

const DEFAULT_QUERIES = [
  "character names people protagonist antagonist called",
  "timeline dates years months ago before after sequence",
  "locations places settings cities countries",
  "facts numbers ages quantities measurements",
];

const CHUNK_TARGET_CHARS = 480;
const CHUNK_OVERLAP_CHARS = 80;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Split plain text into overlapping chunks for retrieval */
export function chunkPlainText(
  text: string,
  chapterId: string,
  chapterTitle: string,
  startIndex = 0
): TextChunk[] {
  if (!text.trim()) return [];

  const chunks: TextChunk[] = [];
  let offset = 0;
  let chunkIndex = startIndex;

  while (offset < text.length) {
    let end = Math.min(offset + CHUNK_TARGET_CHARS, text.length);
    if (end < text.length) {
      const slice = text.slice(offset, end);
      const breakAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(" "));
      if (breakAt > CHUNK_TARGET_CHARS * 0.4) {
        end = offset + breakAt + 1;
      }
    }

    const piece = text.slice(offset, end).trim();
    if (piece) {
      chunks.push({
        id: `${chapterId}-${chunkIndex}`,
        chapterId,
        chapterTitle,
        text: piece,
      });
      chunkIndex += 1;
    }

    if (end >= text.length) break;
    offset = Math.max(end - CHUNK_OVERLAP_CHARS, offset + 1);
  }

  return chunks;
}

/** Build searchable chunks from all chapters */
export function buildBookChunkIndex(chapters: Chapter[]): TextChunk[] {
  return chapters.flatMap((ch) => {
    const plain = stripHtml(ch.content);
    return chunkPlainText(plain, ch.id, ch.title.trim() || "Untitled");
  });
}

function buildIdf(chunks: TextChunk[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const chunk of chunks) {
    const seen = new Set(tokenize(chunk.text));
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const n = chunks.length || 1;
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log(1 + n / count));
  }
  return idf;
}

function scoreChunk(chunk: TextChunk, queryTerms: string[], idf: Map<string, number>): number {
  const chunkTerms = tokenize(chunk.text);
  if (chunkTerms.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const t of chunkTerms) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  let score = 0;
  for (const term of queryTerms) {
    const tf = freq.get(term) ?? 0;
    if (tf > 0) {
      score += (1 + Math.log(tf)) * (idf.get(term) ?? 0.5);
    }
  }
  return score;
}

/** Keyword/chunk RAG — works in browser and Electron without extra deps */
export function retrieveRelevantChunks(
  chunks: TextChunk[],
  options: RagRetrievalOptions = {}
): TextChunk[] {
  const topK = options.topK ?? 12;
  const queries = options.queries ?? DEFAULT_QUERIES;
  if (chunks.length === 0) return [];

  const idf = buildIdf(chunks);
  const queryTerms = [...new Set(queries.flatMap(tokenize))];
  const scored = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTerms, idf) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked: TextChunk[] = [];
  const seen = new Set<string>();

  for (const { chunk } of scored) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    picked.push(chunk);
    if (picked.length >= topK) break;
  }

  // Ensure at least one chunk per chapter when the book is small
  if (picked.length < topK) {
    const byChapter = new Map<string, TextChunk>();
    for (const chunk of chunks) {
      if (!byChapter.has(chunk.chapterId)) {
        byChapter.set(chunk.chapterId, chunk);
      }
    }
    for (const chunk of byChapter.values()) {
      if (seen.has(chunk.id)) continue;
      picked.push(chunk);
      if (picked.length >= topK) break;
    }
  }

  return picked;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function ollamaEmbed(text: string, config: OllamaEmbedConfig): Promise<number[] | null> {
  const base = config.baseUrl.replace(/\/$/, "");
  const model = config.model || "nomic-embed-text";

  try {
    const res = await fetch(`${base}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: number[] };
    return data.embedding ?? null;
  } catch {
    return null;
  }
}

/** Optional semantic retrieval via Ollama embeddings (Electron-friendly, local-first) */
export async function retrieveRelevantChunksWithEmbeddings(
  chunks: TextChunk[],
  options: RagRetrievalOptions & { ollama: OllamaEmbedConfig }
): Promise<{ chunks: TextChunk[]; mode: "keyword" | "embedding" }> {
  const topK = options.topK ?? 12;
  const queries = options.queries ?? DEFAULT_QUERIES;
  if (chunks.length === 0) return { chunks: [], mode: "keyword" };

  const queryText = queries.join(". ");
  const queryVec = await ollamaEmbed(queryText, options.ollama);
  if (!queryVec) {
    return { chunks: retrieveRelevantChunks(chunks, options), mode: "keyword" };
  }

  const scored: { chunk: TextChunk; score: number }[] = [];
  for (const chunk of chunks) {
    const vec = await ollamaEmbed(chunk.text.slice(0, 512), options.ollama);
    if (!vec) continue;
    scored.push({ chunk, score: cosineSimilarity(queryVec, vec) });
  }

  if (scored.length === 0) {
    return { chunks: retrieveRelevantChunks(chunks, options), mode: "keyword" };
  }

  scored.sort((a, b) => b.score - a.score);
  return { chunks: scored.slice(0, topK).map((row) => row.chunk), mode: "embedding" };
}

export function formatChunksForPrompt(chunks: TextChunk[]): string {
  return chunks
    .map((c) => `[${c.chapterTitle}]\n${c.text}`)
    .join("\n\n---\n\n");
}

export function buildPerChapterSnippets(
  chapters: Chapter[],
  maxCharsPerChapter = 180
): string {
  return chapters
    .map((ch) => {
      const plain = stripHtml(ch.content);
      if (!plain) return null;
      const snippet =
        plain.length <= maxCharsPerChapter
          ? plain
          : `${plain.slice(0, maxCharsPerChapter).trim()}…`;
      return `### ${ch.title.trim() || "Untitled"}\n${snippet}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
