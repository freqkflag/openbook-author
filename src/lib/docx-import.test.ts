import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { importDocxFile } from "@/lib/docx-import";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

function paragraph(text: string, style?: string): string {
  const styleXml = style
    ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`
    : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function richParagraph(parts: string): string {
  return `<w:p>${parts}</w:p>`;
}

function boldRun(text: string): string {
  return `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
}

function italicRun(text: string): string {
  return `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
}

function hyperlinkRun(text: string): string {
  return `<w:hyperlink r:id="rIdLink" w:history="1">
    <w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>${text}</w:t></w:r>
  </w:hyperlink>`;
}

function bulletList(items: string[]): string {
  return items
    .map(
      (item) =>
        `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${item}</w:t></w:r></w:p>`
    )
    .join("");
}

function tableXml(): string {
  return `<w:tbl>
    <w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>
    <w:tblGrid><w:gridCol w:w="4675"/><w:gridCol w:w="4675"/></w:tblGrid>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="4675" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="4675" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Cell B</w:t></w:r></w:p></w:tc>
    </w:tr>
  </w:tbl>`;
}

function footnoteParagraph(): string {
  return `<w:p>
    <w:r><w:t>Text with a footnote</w:t></w:r>
    <w:r><w:footnoteReference w:id="1"/></w:r>
  </w:p>`;
}

function buildDocumentXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${body}<w:sectPr/></w:body>
</w:document>`;
}

function buildCoreXml(title: string, author: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>${title}</dc:title>
  <dc:creator>${author}</dc:creator>
  <dc:language>en</dc:language>
</cp:coreProperties>`;
}

function buildDocumentRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>
</Relationships>`;
}

async function buildDocxBlob(options: {
  title?: string;
  author?: string;
  body: string;
}): Promise<Blob> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.folder("_rels")?.file(".rels", ROOT_RELS);
  zip.folder("docProps")?.file("core.xml", buildCoreXml(options.title ?? "", options.author ?? ""));
  zip.folder("word")?.file("document.xml", buildDocumentXml(options.body));
  zip.folder("word")?.folder("_rels")?.file("document.xml.rels", buildDocumentRels());
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

describe("importDocxFile", () => {
  it("rejects files without word/document.xml", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", CONTENT_TYPES);
    const blob = new Blob([await zip.generateAsync({ type: "arraybuffer" })], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await expect(importDocxFile(blob)).rejects.toThrow(/document\.xml/i);
  });

  it("imports metadata, splits on headings, and preserves basic formatting", async () => {
    const body = [
      paragraph("Chapter One", "Heading1"),
      richParagraph(`${boldRun("Bold")}<w:r><w:t xml:space="preserve"> intro and </w:t></w:r>${italicRun("italic")}`),
      paragraph("A wise quote.", "Quote"),
      bulletList(["First item", "Second item"]),
      paragraph("Chapter Two", "Heading1"),
      richParagraph(`<w:r><w:t>Visit </w:t></w:r>${hyperlinkRun("OpenBook")}<w:r><w:t>.</w:t></w:r>`),
    ].join("");

    const blob = await buildDocxBlob({
      title: "DOCX Import Fixture",
      author: "Test Author",
      body,
    });

    const { book, warnings, assetBlobs } = await importDocxFile(blob);

    expect(book.metadata.title).toBe("DOCX Import Fixture");
    expect(book.metadata.author).toBe("Test Author");
    expect(book.template).toBe("portrait");
    expect(book.kbpSettings).toEqual(DEFAULT_KBP_SETTINGS);
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[0].title).toBe("Chapter One");
    expect(book.chapters[0].content).toMatch(/<strong>Bold<\/strong>/i);
    expect(book.chapters[0].content).toMatch(/<em>italic<\/em>/i);
    expect(book.chapters[0].content).toContain("First item");
    expect(book.chapters[0].content).toContain("Second item");
    expect(book.chapters[1].title).toBe("Chapter Two");
    expect(book.chapters[1].content).toMatch(/href="https:\/\/example\.com"/i);
    expect(assetBlobs.size).toBe(0);
    expect(warnings.every((w) => /style/i.test(w))).toBe(true);
  });

  it("reports tables and footnotes in the import report", async () => {
    const body = [
      paragraph("Only Chapter", "Heading1"),
      tableXml(),
      footnoteParagraph(),
    ].join("");

    const blob = await buildDocxBlob({ body });
    const { book, warnings } = await importDocxFile(blob);

    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0].content).toMatch(/<table/i);
    expect(warnings.some((w) => /table/i.test(w))).toBe(true);
    expect(warnings.some((w) => /footnote/i.test(w))).toBe(true);
  });

  it("uses a single chapter when no heading styles are present", async () => {
    const body = richParagraph(`<w:r><w:t>Standalone body without headings.</w:t></w:r>`);
    const blob = await buildDocxBlob({ title: "Standalone Book", body });
    const { book } = await importDocxFile(blob);

    expect(book.chapters).toHaveLength(1);
    expect(book.chapters[0].title).toBe("Standalone Book");
    expect(book.chapters[0].content).toContain("Standalone body without headings");
  });
});
