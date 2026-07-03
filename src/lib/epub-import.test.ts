import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { exportToEpub, transformWidgetsForEpub } from "@/lib/epub";
import { getSectionTemplate } from "@/lib/chapter-sections";
import { importEpubFile, reverseTransformWidgetsFromEpub } from "@/lib/epub-import";
import {
  serializeGuidebookBlockToHtml,
  seedTrailStopPayload,
  seedWorkshopPayload,
  seedCheatSheetPayload,
} from "@/lib/guidebook-seed";

function createSampleBook(): Book {
  const copyrightTpl = getSectionTemplate("copyright");
  const dedicationTpl = getSectionTemplate("dedication");

  return {
    id: "epub-import-roundtrip",
    metadata: {
      title: "Import Test Book",
      subtitle: "Round Trip",
      author: "Test Author",
      publisher: "Test Press",
      language: "en",
      description: "EPUB import test fixture",
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
        content: "<h1>Chapter One</h1><p>Body text for import test.</p>",
        order: 2,
        sectionType: "chapter",
      },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("importEpubFile", () => {
  it("rejects invalid zip without container.xml", async () => {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");
    const blob = await zip.generateAsync({ type: "blob" });
    await expect(importEpubFile(blob)).rejects.toThrow(/container\.xml/i);
  });

  it("imports metadata and chapters from an OpenBook-exported EPUB", async () => {
    const book = createSampleBook();
    const epubBlob = await exportToEpub(book);
    const { book: imported, warnings, assetBlobs } = await importEpubFile(epubBlob);

    expect(imported.metadata.title).toBe("Import Test Book");
    expect(imported.metadata.author).toBe("Test Author");
    expect(imported.chapters.length).toBe(3);
    expect(imported.chapters[0].sectionType).toBe("copyright");
    expect(imported.chapters[1].sectionType).toBe("dedication");
    expect(imported.chapters[2].title).toBe("Chapter One");
    expect(imported.chapters[2].content).toContain("Body text for import test");
    expect(warnings).toEqual([]);
    expect(assetBlobs.size).toBe(0);
  });

  it("imports a minimal hand-built EPUB", async () => {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.folder("META-INF")?.file(
      "container.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );
    zip.file(
      "content.opf",
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Minimal EPUB</dc:title>
    <dc:creator>Jane Doe</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`
    );
    zip.file(
      "text/ch1.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<body epub:type="chapter" xmlns:epub="http://www.idpf.org/2007/ops">
  <h1>Hello Import</h1>
  <p>First paragraph.</p>
</body>
</html>`
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const { book, warnings } = await importEpubFile(blob);

    expect(book.metadata.title).toBe("Minimal EPUB");
    expect(book.metadata.author).toBe("Jane Doe");
    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0].title).toBe("Hello Import");
    expect(book.chapters[0].content).toContain("First paragraph");
    expect(warnings).toEqual([]);
  });

  it("embeds image assets and rewrites src paths", async () => {
    const pngBytes = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.folder("META-INF")?.file(
      "container.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );
    zip.file(
      "content.opf",
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">img-test</dc:identifier>
    <dc:title>Image EPUB</dc:title>
    <dc:language>en</dc:language>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="cover-img" href="images/cover.png" media-type="image/png" properties="cover-image"/>
    <item id="ch1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`
    );
    zip.file("images/cover.png", pngBytes);
    zip.file(
      "text/ch1.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<body>
  <h1>With Image</h1>
  <p><img src="../images/cover.png" alt="cover"/></p>
</body>
</html>`
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const { book, assetBlobs } = await importEpubFile(blob);

    expect(book.assets).toHaveLength(1);
    expect(book.assets[0].filename).toBe("cover.png");
    expect(book.metadata.coverImage).toBe("assets/cover.png");
    expect(book.chapters[0].content).toContain('src="assets/cover.png"');
    expect(assetBlobs.size).toBe(1);
  });
});

describe("reverseTransformWidgetsFromEpub", () => {
  it("converts popup export markup to TipTap popup widget HTML", () => {
    const exported =
      '<details class="popup-widget"><summary>Reveal title</summary><div><p>Secret text</p></div></details>';
    const result = reverseTransformWidgetsFromEpub(exported);
    expect(result).toContain('data-widget="popup"');
    expect(result).toContain('data-title="Reveal title"');
    expect(result).toContain('data-content="<p>Secret text</p>"');
  });

  it("converts gallery export markup to TipTap gallery widget HTML", () => {
    const exported = `<div class="gallery-widget"><figure class="gallery-item"><img src="assets/photo.jpg" alt="Sunset"/><figcaption>Sunset</figcaption></figure></div>`;
    const result = reverseTransformWidgetsFromEpub(exported);
    expect(result).toContain('data-widget="gallery"');
    expect(result).toContain("assets/photo.jpg");
    expect(result).toContain("Sunset");
  });

  it("converts trail stop export markup to guidebook aside HTML", () => {
    const exported = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("trail_stop", seedTrailStopPayload)
    );
    const result = reverseTransformWidgetsFromEpub(exported);
    expect(result).toContain('data-guidebook="trail_stop"');
    expect(result).toContain('data-payload=');
    expect(result).toContain("Summit Vista Overlook");
    expect(result).not.toContain("guidebook-block-header");
  });

  it("converts workshop export markup to guidebook aside HTML", () => {
    const exported = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("workshop", seedWorkshopPayload)
    );
    const result = reverseTransformWidgetsFromEpub(exported);
    expect(result).toContain('data-guidebook="workshop"');
    expect(result).toContain("Trail Reflection Workshop");
    expect(result).toContain("What surprised you most");
  });

  it("converts cheat sheet export markup to guidebook aside HTML", () => {
    const exported = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("cheat_sheet", seedCheatSheetPayload)
    );
    const result = reverseTransformWidgetsFromEpub(exported);
    expect(result).toContain('data-guidebook="cheat_sheet"');
    expect(result).toContain("Trail Quick Reference");
    expect(result).toContain("Difficulty");
  });

  it("round-trips widgets through EPUB export and import", async () => {
    const popup = '<div data-widget="popup" data-title="Tip" data-content="&lt;p&gt;Hint&lt;/p&gt;" class="popup-widget"></div>';
    const gallery =
      '<div data-widget="gallery" data-images="[{&quot;src&quot;:&quot;assets/test.png&quot;,&quot;caption&quot;:&quot;Cap&quot;}]" class="gallery-widget"></div>';
    const guidebook = serializeGuidebookBlockToHtml("trail_stop", seedTrailStopPayload);
    const chapterHtml = `<h1>Widgets</h1>${popup}${gallery}${guidebook}`;

    const book: Book = {
      ...createSampleBook(),
      chapters: [
        {
          id: "widgets-ch",
          title: "Widgets",
          content: chapterHtml,
          order: 0,
          sectionType: "chapter",
        },
      ],
      assets: [
        {
          id: "asset-1",
          filename: "test.png",
          mimeType: "image/png",
          size: 8,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };

    const epubBlob = await exportToEpub(book);
    const { book: imported, warnings } = await importEpubFile(epubBlob);

    expect(imported.chapters).toHaveLength(1);
    const content = imported.chapters[0].content;
    expect(content).toContain('data-widget="popup"');
    expect(content).toContain('data-title="Tip"');
    expect(content).toContain('data-widget="gallery"');
    expect(content).toContain('data-guidebook="trail_stop"');
    expect(content).toContain("Summit Vista Overlook");
    expect(warnings).toEqual([]);
  });
});
