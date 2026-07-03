import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { exportToEpub, getSectionEpubType, hasTitlePage } from "@/lib/epub";
import { getSectionTemplate } from "@/lib/chapter-sections";

function createFrontMatterBook(overrides?: Partial<Book>): Book {
  const copyrightTpl = getSectionTemplate("copyright");
  const dedicationTpl = getSectionTemplate("dedication");

  return {
    id: "front-matter-test",
    metadata: {
      title: "Neon Dreams",
      subtitle: "A Cyberpunk Tale",
      author: "Joey King",
      publisher: "Neon Press",
      language: "en",
      description: "Test book",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      {
        id: "ch-copyright",
        title: "Copyright",
        content: copyrightTpl.content,
        order: 0,
        sectionType: "copyright",
      },
      {
        id: "ch-dedication",
        title: "Dedication",
        content: dedicationTpl.content,
        order: 1,
        sectionType: "dedication",
      },
      {
        id: "ch-one",
        title: "Chapter One",
        content: "<h1>Chapter One</h1><p>Body text.</p>",
        order: 2,
        sectionType: "chapter",
      },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

async function readEpubText(blob: Blob, path: string): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(path);
  return file ? file.async("string") : "";
}

describe("getSectionEpubType", () => {
  it("maps copyright and dedication to EPUB structural types", () => {
    expect(getSectionEpubType("copyright")).toBe("copyright-page");
    expect(getSectionEpubType("dedication")).toBe("dedication");
    expect(getSectionEpubType("chapter")).toBe("chapter");
    expect(getSectionEpubType(undefined)).toBe("chapter");
  });
});

describe("hasTitlePage", () => {
  it("is true when title or author is set", () => {
    const book = createFrontMatterBook();
    expect(hasTitlePage(book)).toBe(true);
    expect(
      hasTitlePage({
        ...book,
        metadata: { ...book.metadata, title: "", author: "" },
      })
    ).toBe(false);
  });
});

describe("EPUB front matter export", () => {
  it("includes title.xhtml in manifest and spine before chapters", async () => {
    const book = createFrontMatterBook();
    const blob = await exportToEpub(book);
    const opf = await readEpubText(blob, "content.opf");

    expect(opf).toContain('id="titlepage" href="text/title.xhtml"');
    expect(opf).toContain('<itemref idref="titlepage"/>');
    expect(opf).toContain('<itemref idref="chapter0"/>');

    const titleIndex = opf.indexOf('<itemref idref="titlepage"/>');
    const chapter0Index = opf.indexOf('<itemref idref="chapter0"/>');
    expect(titleIndex).toBeGreaterThan(-1);
    expect(chapter0Index).toBeGreaterThan(titleIndex);
  });

  it("renders title page with metadata fields", async () => {
    const book = createFrontMatterBook();
    const blob = await exportToEpub(book);
    const titleXhtml = await readEpubText(blob, "text/title.xhtml");

    expect(titleXhtml).toContain('epub:type="titlepage"');
    expect(titleXhtml).toContain("Neon Dreams");
    expect(titleXhtml).toContain("A Cyberpunk Tale");
    expect(titleXhtml).toContain("Joey King");
    expect(titleXhtml).toContain("Neon Press");
  });

  it("assigns epub:type on copyright and dedication chapter sections", async () => {
    const book = createFrontMatterBook();
    const blob = await exportToEpub(book);

    const copyrightXhtml = await readEpubText(blob, "text/chapter0.xhtml");
    const dedicationXhtml = await readEpubText(blob, "text/chapter1.xhtml");
    const chapterXhtml = await readEpubText(blob, "text/chapter2.xhtml");

    expect(copyrightXhtml).toContain('epub:type="copyright-page"');
    expect(dedicationXhtml).toContain('epub:type="dedication"');
    expect(chapterXhtml).toContain('epub:type="chapter"');
  });

  it("lists cover, title page, and toc in landmarks nav", async () => {
    const book = createFrontMatterBook({
      metadata: {
        ...createFrontMatterBook().metadata,
        coverImage: "assets/cover.jpg",
      },
      assets: [
        {
          id: "asset-cover",
          filename: "cover.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const coverBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const blob = await exportToEpub(book, new Map([["asset-cover", coverBytes as unknown as Blob]]));
    const nav = await readEpubText(blob, "nav.xhtml");

    expect(nav).toContain('epub:type="landmarks"');
    expect(nav).toContain('epub:type="cover" href="text/cover.xhtml"');
    expect(nav).toContain('epub:type="titlepage" href="text/title.xhtml"');
    expect(nav).toContain('epub:type="toc" href="nav.xhtml"');
  });

  it("omits title page when metadata has no title or author", async () => {
    const book = createFrontMatterBook({
      metadata: {
        title: "",
        subtitle: "",
        author: "",
        publisher: "",
        language: "en",
        description: "",
      },
    });
    const blob = await exportToEpub(book);
    const opf = await readEpubText(blob, "content.opf");
    const titleFile = await readEpubText(blob, "text/title.xhtml");

    expect(opf).not.toContain('href="text/title.xhtml"');
    expect(titleFile).toBe("");
  });
});
