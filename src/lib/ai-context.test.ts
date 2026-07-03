import { describe, expect, it } from "vitest";
import {
  buildBookAIContext,
  buildConsistencyCheckContext,
  parseGeneratedSectionHtml,
} from "@/lib/ai-context";
import type { Book } from "@/types/book";

function miniBook(overrides: Partial<Book> = {}): Pick<Book, "metadata" | "chapters"> {
  return {
    metadata: {
      title: "Trail Guide",
      subtitle: "Pacific Northwest",
      author: "Alex Writer",
      publisher: "",
      language: "en",
      description: "A guide to hiking trails.",
    },
    chapters: [
      { id: "ch-1", title: "Introduction", content: "<p>Welcome hikers.</p>", order: 0 },
      {
        id: "ch-2",
        title: "Chapter 2",
        content: "<p>More detail about gear and safety on long trails.</p>",
        order: 1,
      },
      { id: "ch-3", title: "Chapter 3", content: "<p>Current chapter body.</p>", order: 2 },
    ],
    ...overrides,
  };
}

describe("buildBookAIContext", () => {
  it("includes TOC and prior chapter excerpts", () => {
    const context = buildBookAIContext(miniBook(), "ch-3");
    expect(context).toContain("Book title: Trail Guide");
    expect(context).toContain("Table of contents:");
    expect(context).toContain("1. Introduction");
    expect(context).toContain("Prior section excerpts:");
    expect(context).toContain("### Introduction");
    expect(context).toContain("Welcome hikers.");
    expect(context).toContain("Current section: Chapter 3");
  });

  it("omits prior excerpts for the first chapter", () => {
    const context = buildBookAIContext(miniBook(), "ch-1");
    expect(context).not.toContain("Prior section excerpts:");
    expect(context).toContain("Current section: Introduction");
  });

  it("parses generated section HTML into title and body", () => {
    const parsed = parseGeneratedSectionHtml(
      "<h1>Workbook Page</h1><p>Reflect on your goals.</p>"
    );
    expect(parsed.title).toBe("Workbook Page");
    expect(parsed.content).toBe("<p>Reflect on your goals.</p>");
  });
});

describe("buildConsistencyCheckContext", () => {
  it("assembles book-wide manuscript excerpts with keyword RAG", async () => {
    const result = await buildConsistencyCheckContext(miniBook(), { useEmbeddings: false });
    expect(result.context).toContain("Book title: Trail Guide");
    expect(result.context).toContain("Table of contents:");
    expect(result.manuscript).toContain("Retrieved passages");
    expect(result.manuscript).toContain("Per-chapter snippets");
    expect(result.ragMode).toBe("keyword");
    expect(result.chaptersScanned).toBe(3);
    expect(result.chunksUsed).toBeGreaterThan(0);
    expect(result.scopeNote).toContain("keyword retrieval");
  });

  it("truncates oversized manuscript payloads", async () => {
    const big = miniBook({
      chapters: Array.from({ length: 40 }, (_, i) => ({
        id: `ch-${i}`,
        title: `Chapter ${i + 1}`,
        content: `<p>${"Lorem ipsum dolor sit amet. ".repeat(80)}</p>`,
        order: i,
      })),
    });
    const result = await buildConsistencyCheckContext(big, {
      useEmbeddings: false,
      maxManuscriptChars: 2000,
    });
    expect(result.manuscript.length).toBeLessThanOrEqual(2100);
    expect(result.manuscript).toContain("[Manuscript truncated");
  });
});
