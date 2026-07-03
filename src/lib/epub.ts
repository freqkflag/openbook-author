import JSZip from "jszip";
import type { Book, Chapter } from "@/types/book";
import { applyKbpToHtml, isKbpEnabled, KBP_CSS } from "@/lib/kbp";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function transformWidgetsForEpub(html: string): string {
  let result = html;

  result = result.replace(
    /<div[^>]*data-widget="popup"[^>]*data-title="([^"]*)"[^>]*data-content="([^"]*)"[^>]*><\/div>/gi,
    (_, title, content) =>
      `<details class="popup-widget"><summary>${title}</summary><div>${content}</div></details>`
  );

  result = result.replace(
    /<div[^>]*data-widget="popup"[^>]*><\/div>/gi,
    '<details class="popup-widget"><summary>Tap to reveal</summary><div><p>Content</p></div></details>'
  );

  result = result.replace(
    /<div[^>]*data-widget="gallery"[^>]*data-images="([^"]*)"[^>]*><\/div>/gi,
    (_, imagesJson) => {
      try {
        const images = JSON.parse(
          imagesJson.replace(/&quot;/g, '"')
        ) as { src: string; caption: string }[];
        const figures = images
          .map(
            (img) =>
              `<figure class="gallery-item"><img src="${img.src}" alt="${escapeXml(img.caption)}"/><figcaption>${escapeXml(img.caption)}</figcaption></figure>`
          )
          .join("");
        return `<div class="gallery-widget">${figures}</div>`;
      } catch {
        return '<div class="gallery-widget"></div>';
      }
    }
  );

  result = result.replace(
    /<div[^>]*data-callout="tip"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-tip">$1</div>'
  );
  result = result.replace(
    /<div[^>]*data-callout="warning"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-warning">$1</div>'
  );
  result = result.replace(
    /<div[^>]*data-callout="step"[^>]*data-number="([^"]*)"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-step"><span class="step-number">$1</span>$2</div>'
  );
  result = result.replace(/<hr[^>]*data-kbp="scene-break"[^>]*\/?>/gi, '<p class="scene-break">* * *</p>');

  return result;
}

function prepareChapterContent(book: Book, content: string): string {
  let result = transformWidgetsForEpub(content);
  if (isKbpEnabled(book)) {
    result = applyKbpToHtml(result, book.kbpSettings);
  }
  return result;
}

export { prepareChapterContent, transformWidgetsForEpub };

function chapterXhtml(book: Book, chapter: Chapter, index: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/main.css"/>
</head>
<body>
  <section epub:type="chapter" id="chapter-${index}">
    ${prepareChapterContent(book, chapter.content)}
  </section>
</body>
</html>`;
}

const MAIN_CSS = `body {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.6;
  margin: 1em;
  color: #1a1a1a;
}
h1 { font-size: 2em; margin-bottom: 0.5em; }
h2 { font-size: 1.5em; margin-top: 1.5em; }
h3 { font-size: 1.25em; }
p { margin: 0.8em 0; }
blockquote {
  border-left: 3px solid #00e5ff;
  margin: 1em 0;
  padding-left: 1em;
  color: #444;
}
img { max-width: 100%; height: auto; }
ul, ol { margin: 0.8em 0; padding-left: 1.5em; }

/* Interactive widgets */
details.popup-widget {
  margin: 1.5em 0;
  border: 1px solid #00e5ff;
  border-radius: 8px;
  overflow: hidden;
}
details.popup-widget summary {
  padding: 0.75em 1em;
  background: #e8f9fc;
  cursor: pointer;
  font-weight: 600;
  color: #006680;
  list-style: none;
}
details.popup-widget summary::-webkit-details-marker { display: none; }
details.popup-widget[open] summary { border-bottom: 1px solid #00e5ff; }
details.popup-widget > div { padding: 1em; }

.gallery-widget {
  margin: 1.5em 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  justify-content: center;
}
.gallery-widget .gallery-item {
  flex: 1 1 200px;
  max-width: 100%;
  text-align: center;
}
.gallery-widget .gallery-item img {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.gallery-widget figcaption {
  font-size: 0.85em;
  color: #666;
  margin-top: 0.5em;
  font-style: italic;
}
`;

export async function exportToEpub(book: Book): Promise<Blob> {
  const zip = new JSZip();
  const { metadata, chapters } = book;
  const isFixed = book.layoutMode === "landscape";
  const useKbp = isKbpEnabled(book);
  const css = useKbp ? KBP_CSS + "\n" + MAIN_CSS.split("/* Interactive")[0] : MAIN_CSS;

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  const manifestItems = chapters
    .map(
      (_, i) =>
        `<item id="chapter${i}" href="text/chapter${i}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join("\n    ");

  const spineItems = chapters
    .map((_, i) => `<itemref idref="chapter${i}"/>`)
    .join("\n    ");

  const navItems = chapters
    .map(
      (ch, i) =>
        `<li><a href="text/chapter${i}.xhtml">${escapeXml(ch.title)}</a></li>`
    )
    .join("\n        ");

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:${book.id}</dc:identifier>
    <dc:title>${escapeXml(metadata.title)}</dc:title>
    <dc:creator>${escapeXml(metadata.author)}</dc:creator>
    <dc:language>${escapeXml(metadata.language || "en")}</dc:language>
    <dc:description>${escapeXml(metadata.description)}</dc:description>
    <dc:publisher>${escapeXml(metadata.publisher || "OpenBook Author")}</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
    ${isFixed ? '<meta property="rendition:layout">pre-paginated</meta>' : '<meta property="rendition:layout">reflowable</meta>'}
  </metadata>
  <manifest>
    <item id="ncx" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="styles/main.css" media-type="text/css"/>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`;

  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
        ${navItems}
    </ol>
  </nav>
</body>
</html>`;

  zip.folder("META-INF")?.file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  zip.file("content.opf", opf);
  zip.file("nav.xhtml", nav);
  zip.folder("styles")?.file("main.css", css);

  const textFolder = zip.folder("text");
  chapters.forEach((chapter, i) => {
    textFolder?.file(`chapter${i}.xhtml`, chapterXhtml(book, chapter, i));
  });

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

export function downloadEpub(book: Book): Promise<void> {
  return exportToEpub(book).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.metadata.title || "book"}.epub`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function exportBookJson(book: Book): void {
  const blob = new Blob([JSON.stringify(book, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${book.metadata.title || "book"}.openbook.json`;
  a.click();
  URL.revokeObjectURL(url);
}
