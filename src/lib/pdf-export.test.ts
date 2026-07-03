import { describe, expect, it } from "vitest";
import { buildPrintDocument } from "@/lib/pdf-export";
import { getSectionTemplate } from "@/lib/chapter-sections";
import type { Book } from "@/types/book";

function baseBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-pdf",
    metadata: {
      title: "PDF Test Book",
      subtitle: "",
      author: "Jane Author",
      publisher: "Test Press",
      language: "en",
      description: "",
      coverImage: "assets/cover.jpg",
    },
    template: "guidebook",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: {
      enabled: false,
      firstLineIndent: true,
      dropCaps: false,
      sceneBreakStyle: "asterisks",
      chapterNumbering: true,
    },
    chapters: [
      {
        id: "ch-1",
        title: "Introduction",
        content: "<p>First chapter body.</p>",
        order: 0,
      },
      {
        id: "ch-2",
        title: "Activities",
        content: getSectionTemplate("workbook").content,
        order: 1,
      },
    ],
    assets: [
      {
        id: "asset-cover",
        filename: "cover.jpg",
        mimeType: "image/jpeg",
        size: 1000,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "asset-inline",
        filename: "photo.png",
        mimeType: "image/png",
        size: 500,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

function bodyHtml(html: string): string {
  const match = html.match(/<body>([\s\S]*)<\/body>/);
  return match?.[1] ?? html;
}

describe("buildPrintDocument", () => {
  it("produces valid HTML with title and language metadata", () => {
    const html = buildPrintDocument(baseBook());
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>PDF Test Book</title>");
  });

  it("includes a cover page when cover image is set", () => {
    const html = buildPrintDocument(baseBook());
    const body = bodyHtml(html);
    expect(body).toContain('class="print-page cover-page"');
    expect(body).toContain('src="assets/cover.jpg"');
    expect(body).toContain('alt="PDF Test Book"');
    expect(body).not.toContain('<header class="print-masthead"');
  });

  it("renders masthead on first chapter when no cover and no TOC", () => {
    const html = buildPrintDocument(
      baseBook({
        metadata: {
          ...baseBook().metadata,
          coverImage: undefined,
        },
        chapters: [
          {
            id: "ch-1",
            title: "Introduction",
            content: "<p>First chapter body.</p>",
            order: 0,
          },
        ],
      }),
      undefined,
      { includeToc: false }
    );
    const body = bodyHtml(html);
    expect(body).toContain('<header class="print-masthead"');
    expect(body).toContain("print-book-title");
    expect(body).toContain("PDF Test Book");
    expect(body).toContain("Test Press");
    expect(body).toContain("by Jane Author");
    expect(body).not.toContain('class="print-page cover-page"');
    expect(body).not.toContain("print-toc-page");
  });

  it("renders one print-page section per chapter plus cover and TOC", () => {
    const html = buildPrintDocument(baseBook());
    const pageCount = countMatches(bodyHtml(html), /<section class="print-page/g);
    expect(pageCount).toBe(4);
  });

  it("orders chapters by order field", () => {
    const html = buildPrintDocument(
      baseBook({
        chapters: [
          { id: "ch-b", title: "Second", content: "<p>B body</p>", order: 1 },
          { id: "ch-a", title: "First", content: "<p>A body</p>", order: 0 },
        ],
      })
    );
    const firstIdx = html.indexOf("First");
    const secondIdx = html.indexOf("Second");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });

  it("includes chapter titles and workbook section content", () => {
    const html = buildPrintDocument(baseBook());
    expect(html).toContain("preview-chapter-title");
    expect(html).toContain("Introduction");
    expect(html).toContain('class="section-workbook"');
    expect(html).toContain("workbook-instructions");
  });

  it("includes section print CSS for journal, checklist, and practice-quiz", () => {
    const html = buildPrintDocument(baseBook());
    expect(html).toContain(".print-body .section-journal");
    expect(html).toContain(".print-body .section-workbook");
    expect(html).toContain(".print-body .section-checklist");
    expect(html).toContain(".print-body .section-reflection");
    expect(html).toContain(".print-body .section-practice-quiz");
    expect(html).toContain(".print-body .quiz-answer-line");
  });

  it("resolves inline asset src via blob map", () => {
    const book = baseBook({
      chapters: [
        {
          id: "ch-img",
          title: "Photos",
          content: '<p><img src="assets/photo.png" alt="Photo"/></p>',
          order: 0,
        },
      ],
      metadata: { ...baseBook().metadata, coverImage: undefined },
    });
    const blobs = new Map<string, Blob>([
      ["asset-inline", new Blob(["png"], { type: "image/png" })],
    ]);
    const html = buildPrintDocument(book, blobs);
    expect(html).toContain('src="blob:');
    expect(html).not.toContain('src="assets/photo.png"');
  });

  it("escapes HTML in metadata fields", () => {
    const html = buildPrintDocument(
      baseBook({
        metadata: {
          ...baseBook().metadata,
          title: 'Book <script>alert("x")</script>',
          author: "O'Brien & Co",
          coverImage: undefined,
        },
        chapters: [
          {
            id: "ch-1",
            title: "Introduction",
            content: "<p>First chapter body.</p>",
            order: 0,
          },
        ],
      }),
      undefined,
      { includeToc: false }
    );
    expect(html).toContain("Book &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("O'Brien &amp; Co");
    expect(html).not.toContain("<script>alert");
  });

  it("applies print-kbp class when KBP mode is enabled", () => {
    const html = buildPrintDocument(
      baseBook({
        formatProfile: "kbp",
        kbpSettings: {
          enabled: true,
          firstLineIndent: true,
          dropCaps: false,
          sceneBreakStyle: "asterisks",
          chapterNumbering: true,
        },
        metadata: { ...baseBook().metadata, coverImage: undefined },
      })
    );
    expect(html).toContain('class="print-page print-kbp"');
  });

  it("includes US Letter @page size by default", () => {
    const html = buildPrintDocument(baseBook());
    expect(html).toContain("size: letter");
  });

  it("includes journal section markup from template", () => {
    const journalContent = getSectionTemplate("journal").content;
    const html = buildPrintDocument(
      baseBook({
        chapters: [
          { id: "ch-j", title: "Journal", content: journalContent, order: 0 },
        ],
        metadata: { ...baseBook().metadata, coverImage: undefined },
      }),
      undefined,
      { includeToc: false }
    );
    expect(html).toContain('class="section-journal"');
    expect(html).toContain("journal-prompt");
    expect(html).toContain("journal-lines");
  });
});
