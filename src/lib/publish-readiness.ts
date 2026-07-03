import type { Book, Chapter } from "@/types/book";
import type { GuidebookBlockType } from "@/types/guidebook";
import {
  normalizeTrailStopPayload,
  normalizeWorkshopPayload,
  normalizeCheatSheetPayload,
} from "@/types/guidebook";
import { getAssetByFilename } from "@/lib/asset-store";
import { isKbpEnabled } from "@/lib/kbp";
import {
  epubValidationToReadinessIssues,
  validateBookEpubExport,
  type EpubValidationResult,
} from "@/lib/epub-validation";

const H1_RE = /<h1[\s>]/i;
const HEADING_RE = /<h([1-6])[\s>]/gi;

export type ReadinessSeverity = "error" | "warning";

export interface ReadinessIssue {
  id: string;
  severity: ReadinessSeverity;
  message: string;
  chapterId?: string;
  chapterTitle?: string;
}

export interface PublishReadinessReport {
  issues: ReadinessIssue[];
  errorCount: number;
  warningCount: number;
  /** True when no blocking errors remain */
  ready: boolean;
}

const GUIDEBOOK_BLOCK_RE =
  /<(?:aside|div)[^>]*data-guidebook="(trail_stop|workshop|cheat_sheet)"[^>]*data-payload="([^"]*)"[^>]*>/gi;

const GUIDEBOOK_BLOCK_RE_REVERSED =
  /<(?:aside|div)[^>]*data-payload="([^"]*)"[^>]*data-guidebook="(trail_stop|workshop|cheat_sheet)"[^>]*>/gi;

const ASSET_SRC_RE = /src="(assets\/[^"]+)"/g;
const IMG_TAG_RE = /<img\b[^>]*>/gi;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlAttributeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodePayload(raw: string): unknown {
  try {
    return JSON.parse(decodeHtmlAttributeEntities(raw));
  } catch {
    return null;
  }
}

function issue(
  id: string,
  severity: ReadinessSeverity,
  message: string,
  chapter?: Chapter
): ReadinessIssue {
  return {
    id,
    severity,
    message,
    chapterId: chapter?.id,
    chapterTitle: chapter?.title,
  };
}

function checkEmptyChapters(book: Book, issues: ReadinessIssue[]): void {
  for (const chapter of book.chapters) {
    if (!stripHtml(chapter.content)) {
      issues.push(
        issue(
          `empty-chapter-${chapter.id}`,
          "error",
          `“${chapter.title}” has no body content`,
          chapter
        )
      );
    }
  }
}

function checkMetadata(book: Book, issues: ReadinessIssue[]): void {
  if (!book.metadata.title.trim()) {
    issues.push(issue("missing-title", "error", "Book title is empty"));
  }
  if (!book.metadata.author.trim()) {
    issues.push(issue("missing-author", "warning", "Author name is missing"));
  }
  if (!book.metadata.coverImage) {
    issues.push(issue("missing-cover", "warning", "No cover image set"));
  }
}

function assetExists(book: Book, assetPath: string): boolean {
  const match = assetPath.match(/^assets\/(.+)$/);
  if (!match) return true;
  return Boolean(getAssetByFilename(book, match[1]));
}

function checkAssetRefs(book: Book, issues: ReadinessIssue[]): void {
  const seen = new Set<string>();

  const paths: { path: string; chapter?: Chapter }[] = [];
  if (book.metadata.coverImage?.startsWith("assets/")) {
    paths.push({ path: book.metadata.coverImage });
  }
  for (const chapter of book.chapters) {
    let match: RegExpExecArray | null;
    const re = new RegExp(ASSET_SRC_RE.source, "g");
    while ((match = re.exec(chapter.content)) !== null) {
      paths.push({ path: match[1], chapter });
    }
  }

  for (const { path, chapter } of paths) {
    if (seen.has(path) || assetExists(book, path)) continue;
    seen.add(path);
    const label = chapter ? ` in “${chapter.title}”` : " (cover)";
    issues.push(
      issue(
        `broken-asset-${path}`,
        "error",
        `Broken image reference: ${path}${label}`,
        chapter
      )
    );
  }
}

function checkMissingAltText(book: Book, issues: ReadinessIssue[]): void {
  for (const chapter of book.chapters) {
    const tags = chapter.content.match(IMG_TAG_RE) ?? [];
    for (const tag of tags) {
      const altMatch = tag.match(/\balt="([^"]*)"/i);
      if (!altMatch || !altMatch[1].trim()) {
        issues.push(
          issue(
            `missing-alt-${chapter.id}-${tag.slice(0, 24)}`,
            "error",
            `Image missing alt text in “${chapter.title}”`,
            chapter
          )
        );
        break;
      }
    }
  }
}

function validateGuidebookPayload(
  blockType: GuidebookBlockType,
  payloadRaw: string,
  chapter: Chapter,
  blockIndex: number,
  issues: ReadinessIssue[]
): void {
  const data = decodePayload(payloadRaw);
  if (data === null) {
    issues.push(
      issue(
        `guidebook-parse-${chapter.id}-${blockIndex}`,
        "error",
        `Guidebook block #${blockIndex + 1} in “${chapter.title}” has invalid JSON payload`,
        chapter
      )
    );
    return;
  }

  switch (blockType) {
    case "trail_stop": {
      const normalized = normalizeTrailStopPayload(data as Parameters<typeof normalizeTrailStopPayload>[0]);
      if (!normalized.name.trim()) {
        issues.push(
          issue(
            `guidebook-trail-name-${chapter.id}-${blockIndex}`,
            "warning",
            `Trail stop #${blockIndex + 1} in “${chapter.title}” has no name`,
            chapter
          )
        );
      }
      break;
    }
    case "workshop": {
      const normalized = normalizeWorkshopPayload(data as Parameters<typeof normalizeWorkshopPayload>[0]);
      if (!normalized.title.trim()) {
        issues.push(
          issue(
            `guidebook-workshop-title-${chapter.id}-${blockIndex}`,
            "warning",
            `Workshop #${blockIndex + 1} in “${chapter.title}” has no title`,
            chapter
          )
        );
      }
      if (normalized.exercises.some((ex) => !ex.prompt.trim())) {
        issues.push(
          issue(
            `guidebook-workshop-prompt-${chapter.id}-${blockIndex}`,
            "warning",
            `Workshop #${blockIndex + 1} in “${chapter.title}” has an empty exercise prompt`,
            chapter
          )
        );
      }
      break;
    }
    case "cheat_sheet": {
      const normalized = normalizeCheatSheetPayload(data as Parameters<typeof normalizeCheatSheetPayload>[0]);
      if (!normalized.title.trim()) {
        issues.push(
          issue(
            `guidebook-cheat-title-${chapter.id}-${blockIndex}`,
            "warning",
            `Cheat sheet #${blockIndex + 1} in “${chapter.title}” has no title`,
            chapter
          )
        );
      }
      if (normalized.items.some((item) => !item.label.trim() || !item.value.trim())) {
        issues.push(
          issue(
            `guidebook-cheat-item-${chapter.id}-${blockIndex}`,
            "warning",
            `Cheat sheet #${blockIndex + 1} in “${chapter.title}” has empty rows`,
            chapter
          )
        );
      }
      break;
    }
    default: {
      const _exhaustive: never = blockType;
      return _exhaustive;
    }
  }
}

function checkGuidebookBlocks(book: Book, issues: ReadinessIssue[]): void {
  for (const chapter of book.chapters) {
    let blockIndex = 0;

    let match: RegExpExecArray | null;
    const re = new RegExp(GUIDEBOOK_BLOCK_RE.source, "gi");
    while ((match = re.exec(chapter.content)) !== null) {
      validateGuidebookPayload(
        match[1] as GuidebookBlockType,
        match[2],
        chapter,
        blockIndex,
        issues
      );
      blockIndex += 1;
    }

    const reRev = new RegExp(GUIDEBOOK_BLOCK_RE_REVERSED.source, "gi");
    while ((match = reRev.exec(chapter.content)) !== null) {
      validateGuidebookPayload(
        match[2] as GuidebookBlockType,
        match[1],
        chapter,
        blockIndex,
        issues
      );
      blockIndex += 1;
    }
  }
}

function checkTocIssues(book: Book, issues: ReadinessIssue[]): void {
  const titleGroups = new Map<string, Chapter[]>();

  for (const chapter of book.chapters) {
    const normalizedTitle = chapter.title.trim();
    if (!normalizedTitle) {
      issues.push(
        issue(
          `empty-chapter-title-${chapter.id}`,
          "warning",
          "A chapter has no title — it will not appear in the table of contents",
          chapter
        )
      );
      continue;
    }

    const key = normalizedTitle.toLowerCase();
    const group = titleGroups.get(key) ?? [];
    group.push(chapter);
    titleGroups.set(key, group);
  }

  for (const [, chapters] of titleGroups) {
    if (chapters.length > 1) {
      issues.push(
        issue(
          `duplicate-title-${chapters[0].id}`,
          "warning",
          `Duplicate chapter title “${chapters[0].title}” (${chapters.length} chapters)`,
          chapters[0]
        )
      );
    }
  }

  const titledChapters = book.chapters.filter((ch) => ch.title.trim());
  if (book.chapters.length > 0 && titledChapters.length === 0) {
    issues.push(issue("empty-toc", "error", "Table of contents is empty — all chapters lack titles"));
  }
}

function checkHeadingHierarchy(book: Book, issues: ReadinessIssue[]): void {
  for (const chapter of book.chapters) {
    const levels: number[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(HEADING_RE.source, "gi");
    while ((match = re.exec(chapter.content)) !== null) {
      levels.push(Number.parseInt(match[1], 10));
    }

    if (levels.length === 0) continue;

    const h1Count = levels.filter((level) => level === 1).length;
    if (h1Count > 1) {
      issues.push(
        issue(
          `multiple-h1-${chapter.id}`,
          "warning",
          `“${chapter.title}” has ${h1Count} H1 headings — use one H1 per section`,
          chapter
        )
      );
    }

    for (let i = 1; i < levels.length; i += 1) {
      if (levels[i] - levels[i - 1] > 1) {
        issues.push(
          issue(
            `heading-skip-${chapter.id}-${i}`,
            "warning",
            `Heading level skip (H${levels[i - 1]} → H${levels[i]}) in “${chapter.title}”`,
            chapter
          )
        );
        break;
      }
    }
  }
}

function checkKbpStructure(book: Book, issues: ReadinessIssue[]): void {
  if (!isKbpEnabled(book)) return;

  for (const chapter of book.chapters) {
    if (chapter.sectionType && chapter.sectionType !== "chapter") continue;
    if (!H1_RE.test(chapter.content)) {
      issues.push(
        issue(
          `missing-h1-${chapter.id}`,
          "warning",
          `“${chapter.title}” has no H1 heading (KBP uses H1 for automatic TOC)`,
          chapter
        )
      );
    }
  }
}

function checkKbpStoreMetadata(book: Book, issues: ReadinessIssue[]): void {
  if (!isKbpEnabled(book)) return;

  const desc = book.metadata.description.trim();
  if (!desc) {
    issues.push(
      issue(
        "kbp-missing-description",
        "warning",
        "KBP export: book description is empty (required for KDP listing)"
      )
    );
  } else if (desc.length < 50) {
    issues.push(
      issue(
        "kbp-description-short",
        "warning",
        `Description is ${desc.length} characters — KDP recommends at least 50`
      )
    );
  } else if (desc.length > 4000) {
    issues.push(
      issue(
        "kbp-description-long",
        "error",
        `Description is ${desc.length} characters — KDP maximum is 4000`
      )
    );
  }

  if (!book.metadata.isbn?.trim()) {
    issues.push(
      issue("kbp-missing-isbn", "warning", "ISBN not set (optional for KDP but recommended)")
    );
  }
  if (!book.metadata.keywords?.length) {
    issues.push(issue("kbp-missing-keywords", "warning", "No keywords set for store listing"));
  }
  if (!book.metadata.bisac?.length) {
    issues.push(issue("kbp-missing-bisac", "warning", "No BISAC categories set"));
  }
  if (!book.metadata.ageRating?.trim()) {
    issues.push(issue("kbp-missing-age-rating", "warning", "Age rating not set for store listing"));
  }
}

function mergeEpubValidationWarnings(
  report: PublishReadinessReport,
  epubResult: EpubValidationResult
): PublishReadinessReport {
  const epubIssues = epubValidationToReadinessIssues(epubResult);
  if (epubIssues.length === 0) {
    return report;
  }

  const issues = [...report.issues, ...epubIssues];
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    issues,
    errorCount: report.errorCount,
    warningCount,
    ready: report.ready,
  };
}

/** Pre-flight validation before export or publish */
export function assessPublishReadiness(book: Book): PublishReadinessReport {
  const issues: ReadinessIssue[] = [];

  if (book.chapters.length === 0) {
    issues.push(issue("no-chapters", "error", "Book has no chapters"));
  }

  checkMetadata(book, issues);
  checkEmptyChapters(book, issues);
  checkAssetRefs(book, issues);
  checkMissingAltText(book, issues);
  checkHeadingHierarchy(book, issues);
  checkGuidebookBlocks(book, issues);
  checkTocIssues(book, issues);
  checkKbpStructure(book, issues);
  checkKbpStoreMetadata(book, issues);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    issues,
    errorCount,
    warningCount,
    ready: errorCount === 0,
  };
}

/**
 * Pre-flight checks plus post-export EPUB structural validation.
 * EPUB findings are warnings only (non-blocking) until EPUBCheck is wired in CI.
 */
export async function assessPublishReadinessWithEpub(
  book: Book,
  assetBlobs?: Map<string, Blob>
): Promise<PublishReadinessReport> {
  const report = assessPublishReadiness(book);
  const epubResult = await validateBookEpubExport(book, assetBlobs);
  return mergeEpubValidationWarnings(report, epubResult);
}

export function formatReadinessExportWarning(report: PublishReadinessReport): string {
  const lines = report.issues
    .filter((i) => i.severity === "error")
    .slice(0, 5)
    .map((i) => `• ${i.message}`);
  const extra =
    report.errorCount > 5 ? `\n…and ${report.errorCount - 5} more error(s)` : "";
  return `Export blocked issues:\n${lines.join("\n")}${extra}\n\nExport anyway?`;
}
