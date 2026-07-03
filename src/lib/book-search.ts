export interface BookSearchChapter {
  id: string;
  title: string;
  content: string;
}

export interface BookSearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface BookSearchResult {
  chapterId: string;
  chapterTitle: string;
  matchCount: number;
}

export interface BookReplaceResult {
  chapterId: string;
  content: string;
  replacementCount: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchPattern(
  query: string,
  options: BookSearchOptions = {},
  global = true
): RegExp | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const flags = global
    ? options.caseSensitive
      ? "g"
      : "gi"
    : options.caseSensitive
      ? ""
      : "i";
  const escaped = escapeRegExp(trimmed);
  const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
  return new RegExp(pattern, flags);
}

export function countMatches(text: string, query: string, options: BookSearchOptions = {}): number {
  const pattern = buildSearchPattern(query, options);
  if (!pattern) return 0;

  const matches = text.match(pattern);
  return matches?.length ?? 0;
}

export function searchBook(
  chapters: BookSearchChapter[],
  query: string,
  options: BookSearchOptions = {}
): BookSearchResult[] {
  const pattern = buildSearchPattern(query, options);
  if (!pattern) return [];

  return chapters
    .map((chapter) => ({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      matchCount: countMatches(chapter.content, query, options),
    }))
    .filter((result) => result.matchCount > 0);
}

export function replaceInText(
  text: string,
  query: string,
  replacement: string,
  options: BookSearchOptions & { replaceAll?: boolean } = {}
): { content: string; replacementCount: number } {
  if (options.replaceAll === false) {
    const pattern = buildSearchPattern(query, options, false);
    if (!pattern) return { content: text, replacementCount: 0 };

    const next = text.replace(pattern, replacement);
    return {
      content: next,
      replacementCount: next === text ? 0 : 1,
    };
  }

  const pattern = buildSearchPattern(query, options, true);
  if (!pattern) return { content: text, replacementCount: 0 };

  let replacementCount = 0;
  const content = text.replace(pattern, () => {
    replacementCount += 1;
    return replacement;
  });

  return { content, replacementCount };
}

export function replaceInBook(
  chapters: BookSearchChapter[],
  query: string,
  replacement: string,
  options: BookSearchOptions & { replaceAll?: boolean } = {}
): { updates: BookReplaceResult[]; totalReplacements: number } {
  const updates: BookReplaceResult[] = [];
  let totalReplacements = 0;

  for (const chapter of chapters) {
    const { content, replacementCount } = replaceInText(
      chapter.content,
      query,
      replacement,
      options
    );
    if (replacementCount > 0) {
      updates.push({
        chapterId: chapter.id,
        content,
        replacementCount,
      });
      totalReplacements += replacementCount;
    }
  }

  return { updates, totalReplacements };
}
