import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { exportToEpub } from "@/lib/epub";
import { kbpManifest } from "@/lib/kbp";
import { buildKbpTocEntries, buildTocTree } from "@/lib/book-structure";

function createHierarchicalBook(): Book {
  return {
    id: "hierarchical-toc-test",
    metadata: {
      title: "Three Parts",
      subtitle: "",
      author: "Test Author",
      publisher: "OpenBook",
      language: "en",
      description: "Hierarchical TOC test book",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      {
        id: "ch-front",
        title: "Introduction",
        content: "<p>Front matter.</p>",
        order: 0,
        sectionType: "introduction",
      },
      {
        id: "ch-1",
        title: "Opening Scene",
        content: "<h1>Opening Scene</h1><p>Part one begins.</p>",
        order: 1,
      },
      {
        id: "ch-2",
        title: "The Journey",
        content: "<h1>The Journey</h1><p>Still part one.</p>",
        order: 2,
      },
      {
        id: "ch-3",
        title: "New Horizons",
        content: "<h1>New Horizons</h1><p>Part two.</p>",
        order: 3,
      },
    ],
    parts: [
      {
        id: "part-1",
        title: "Part I — Awakening",
        order: 0,
        chapterIds: ["ch-1", "ch-2"],
      },
      {
        id: "part-2",
        title: "Part II — Expansion",
        order: 1,
        chapterIds: ["ch-3"],
      },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

async function readEpubText(blob: Blob, path: string): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(path);
  return file ? file.async("string") : "";
}

describe("buildTocTree", () => {
  it("builds nested part nodes with ungrouped chapters first", () => {
    const tree = buildTocTree(createHierarchicalBook());
    expect(tree).toHaveLength(3);
    expect(tree[0]).toMatchObject({ type: "chapter", title: "Introduction" });
    expect(tree[1]).toMatchObject({
      type: "part",
      title: "Part I — Awakening",
    });
    expect(tree[1].type === "part" && tree[1].children).toHaveLength(2);
  });
});

describe("EPUB hierarchical TOC export", () => {
  it("keeps flat spine order while nesting nav under parts", async () => {
    const book = createHierarchicalBook();
    const blob = await exportToEpub(book);
    const opf = await readEpubText(blob, "content.opf");
    const nav = await readEpubText(blob, "nav.xhtml");

    expect(opf).toContain('<itemref idref="chapter0"/>');
    expect(opf).toContain('<itemref idref="chapter1"/>');
    expect(opf).toContain('<itemref idref="chapter2"/>');
    expect(opf).toContain('<itemref idref="chapter3"/>');

    const ch0 = opf.indexOf('<itemref idref="chapter0"/>');
    const ch3 = opf.indexOf('<itemref idref="chapter3"/>');
    expect(ch0).toBeGreaterThan(-1);
    expect(ch3).toBeGreaterThan(ch0);

    expect(nav).toContain('epub:type="toc"');
    expect(nav).toContain("Part I — Awakening");
    expect(nav).toContain("Part II — Expansion");
    expect(nav).toContain('<a href="text/chapter0.xhtml">Introduction</a>');
    expect(nav).toContain('<a href="text/chapter1.xhtml">Opening Scene</a>');
    expect(nav).toMatch(/<span>Part I — Awakening<\/span>\s*<ol>/);
    expect(nav).toMatch(/<span>Part II — Expansion<\/span>\s*<ol>/);
  });

  it("exports flat nav when book has no parts", async () => {
    const book = createHierarchicalBook();
    const flatBook = { ...book, parts: undefined };
    const blob = await exportToEpub(flatBook);
    const nav = await readEpubText(blob, "nav.xhtml");

    expect(nav).toContain('<a href="text/chapter0.xhtml">Introduction</a>');
    expect(nav).not.toContain("Part I — Awakening");
    expect(nav).not.toMatch(/<span>Part I/);
  });
});

describe("KBP hierarchical TOC export", () => {
  it("includes nested toc in manifest and toc.json", async () => {
    const book = createHierarchicalBook();
    const entries = buildKbpTocEntries(book);

    expect(entries[0]).toMatchObject({ title: "Introduction" });
    expect(entries[1]).toMatchObject({ title: "Part I — Awakening" });
    expect(entries[1].children).toHaveLength(2);

    const manifest = kbpManifest({
      ...book,
      formatProfile: "kbp",
      kbpSettings: { ...book.kbpSettings, enabled: true },
    });

    expect(manifest.hierarchicalToc).toBe(true);
    expect(manifest.partCount).toBe(2);
    expect(manifest.toc[1].children).toHaveLength(2);
  });
});
