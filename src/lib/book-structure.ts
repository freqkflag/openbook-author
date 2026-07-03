import type { Book, BookPart, Chapter } from "@/types/book";

export function hasHierarchicalToc(book: Pick<Book, "parts">): boolean {
  return (book.parts?.length ?? 0) > 0;
}

/** Normalize parts: drop unknown chapter ids and dedupe across parts (first part wins). */
export function normalizeBookParts(
  parts: BookPart[] | undefined,
  chapters: Chapter[]
): BookPart[] | undefined {
  if (!parts?.length) return undefined;

  const chapterIdSet = new Set(chapters.map((ch) => ch.id));
  const assigned = new Set<string>();

  const normalized = parts
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((part, index) => ({
      ...part,
      order: index,
      chapterIds: part.chapterIds.filter((id) => {
        if (!chapterIdSet.has(id) || assigned.has(id)) return false;
        assigned.add(id);
        return true;
      }),
    }));

  return normalized.length > 0 ? normalized : undefined;
}

export function getChapterIndex(book: Book, chapterId: string): number {
  return book.chapters.findIndex((ch) => ch.id === chapterId);
}

export function getPartForChapter(book: Pick<Book, "parts">, chapterId: string): BookPart | undefined {
  return book.parts?.find((part) => part.chapterIds.includes(chapterId));
}

export function getUngroupedChapterIds(book: Book): string[] {
  const grouped = new Set(book.parts?.flatMap((p) => p.chapterIds) ?? []);
  return book.chapters
    .filter((ch) => !grouped.has(ch.id))
    .sort((a, b) => a.order - b.order)
    .map((ch) => ch.id);
}

export interface TocNavNode {
  type: "chapter";
  chapterId: string;
  title: string;
  href: string;
}

export interface TocPartNode {
  type: "part";
  partId: string;
  title: string;
  children: TocNavNode[];
}

export type TocTreeNode = TocNavNode | TocPartNode;

function chapterNavNode(book: Book, chapter: Chapter): TocNavNode {
  const index = getChapterIndex(book, chapter.id);
  return {
    type: "chapter",
    chapterId: chapter.id,
    title: chapter.title,
    href: `text/chapter${index}.xhtml`,
  };
}

/** Build nested TOC tree for EPUB nav and KBP manifest. Flat when no parts. */
export function buildTocTree(book: Book): TocTreeNode[] {
  if (!hasHierarchicalToc(book)) {
    return book.chapters
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ch) => chapterNavNode(book, ch));
  }

  const chapterById = new Map(book.chapters.map((ch) => [ch.id, ch]));
  const nodes: TocTreeNode[] = [];

  for (const chapterId of getUngroupedChapterIds(book)) {
    const chapter = chapterById.get(chapterId);
    if (chapter?.title.trim()) {
      nodes.push(chapterNavNode(book, chapter));
    }
  }

  const parts = book.parts!.slice().sort((a, b) => a.order - b.order);
  for (const part of parts) {
    const children = part.chapterIds
      .map((id) => chapterById.get(id))
      .filter((ch): ch is Chapter => Boolean(ch && ch.title.trim()))
      .map((ch) => chapterNavNode(book, ch));

    nodes.push({
      type: "part",
      partId: part.id,
      title: part.title,
      children,
    });
  }

  return nodes;
}

export function buildEpubNavListItems(
  book: Book,
  escapeXml: (text: string) => string
): string {
  const tree = buildTocTree(book);

  function renderNode(node: TocTreeNode): string {
    if (node.type === "chapter") {
      return `<li><a href="${node.href}">${escapeXml(node.title)}</a></li>`;
    }

    const childItems = node.children.map(renderNode).join("\n            ");
    const label = escapeXml(node.title);
    if (childItems.length === 0) {
      return `<li><span>${label}</span></li>`;
    }
    return `<li><span>${label}</span><ol>\n            ${childItems}\n        </ol></li>`;
  }

  return tree.map(renderNode).join("\n        ");
}

export interface KbpTocEntry {
  title: string;
  href?: string;
  children?: KbpTocEntry[];
}

export function buildKbpTocEntries(book: Book): KbpTocEntry[] {
  const tree = buildTocTree(book);

  return tree.map((node) => {
    if (node.type === "chapter") {
      const index = getChapterIndex(book, node.chapterId);
      const filename = `${String(index + 1).padStart(2, "0")}-${node.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "chapter"}.html`;
      return { title: node.title, href: `chapters/${filename}` };
    }
    return {
      title: node.title,
      children: node.children.map((child) => {
        const index = getChapterIndex(book, child.chapterId);
        const filename = `${String(index + 1).padStart(2, "0")}-${child.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "chapter"}.html`;
        return { title: child.title, href: `chapters/${filename}` };
      }),
    };
  });
}
