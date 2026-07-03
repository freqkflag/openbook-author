import JSZip from "jszip";
import type { Book, Chapter } from "@/types/book";
import type {
  GuidebookBlockType,
  TrailStopPayload,
  WorkshopPayload,
  CheatSheetPayload,
} from "@/types/guidebook";
import { applyKbpToHtml, isKbpEnabled, KBP_CSS } from "@/lib/kbp";
import { getAssetByFilename } from "@/lib/asset-store";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodePayload(raw: string): unknown {
  try {
    return JSON.parse(raw.replace(/&quot;/g, '"'));
  } catch {
    return null;
  }
}

function serializeGuidebookBlock(blockType: GuidebookBlockType, payloadRaw: string): string {
  const data = decodePayload(payloadRaw);
  const typeClass = `guidebook-${blockType.replace("_", "-")}`;

  if (blockType === "trail_stop") {
    const d = (data || {}) as Partial<TrailStopPayload>;
    const amenities = (d.amenities || [])
      .filter(Boolean)
      .map((a) => `<li>${escapeHtml(a)}</li>`)
      .join("");
    const amenitiesHtml = amenities
      ? `<ul class="trail-amenities">${amenities}</ul>`
      : "";
    const meta = [d.mileMarker ? `Mile ${escapeHtml(d.mileMarker)}` : "", d.elevation ? escapeHtml(d.elevation) : ""]
      .filter(Boolean)
      .join(" · ");
    return `<aside class="guidebook-block ${typeClass}">
  <header class="guidebook-block-header">Trail Stop</header>
  <div class="guidebook-block-body">
    <h3>${escapeHtml(d.name || "Trail Stop")}</h3>
    ${meta ? `<p class="trail-meta">${meta}</p>` : ""}
    ${d.notes ? `<p>${escapeHtml(d.notes)}</p>` : ""}
    ${amenitiesHtml}
  </div>
</aside>`;
  }

  if (blockType === "workshop") {
    const d = (data || {}) as Partial<WorkshopPayload>;
    const exercises = (d.exercises || [])
      .map(
        (ex, i) =>
          `<div class="workshop-exercise"><strong>${i + 1}.</strong> ${escapeHtml(ex.prompt || "")}<span class="response-hint"> (${ex.responseType === "long" ? "long answer" : "short answer"})</span></div>`
      )
      .join("");
    return `<aside class="guidebook-block ${typeClass}">
  <header class="guidebook-block-header">Workshop</header>
  <div class="guidebook-block-body">
    <h3>${escapeHtml(d.title || "Workshop")}</h3>
    ${exercises}
  </div>
</aside>`;
  }

  const d = (data || {}) as Partial<CheatSheetPayload>;
  const cols = d.columns === 3 ? 3 : 2;
  const items = (d.items || [])
    .map(
      (item) =>
        `<span class="cheat-label">${escapeHtml(item.label || "")}</span><span>${escapeHtml(item.value || "")}</span>`
    )
    .join("");
  return `<aside class="guidebook-block ${typeClass}">
  <header class="guidebook-block-header">Cheat Sheet</header>
  <div class="guidebook-block-body">
    <h3>${escapeHtml(d.title || "Quick Reference")}</h3>
    <div class="cheat-grid cols-${cols}">${items}</div>
  </div>
</aside>`;
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
            (img) => {
              const src = img.src.startsWith("assets/")
                ? `../images/${img.src.replace("assets/", "")}`
                : img.src;
              return `<figure class="gallery-item"><img src="${src}" alt="${escapeXml(img.caption)}"/><figcaption>${escapeXml(img.caption)}</figcaption></figure>`;
            }
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

  result = result.replace(
    /<(?:aside|div)[^>]*data-guidebook="(trail_stop|workshop|cheat_sheet)"[^>]*data-payload="([^"]*)"[^>]*>\s*<\/(?:aside|div)>/gi,
    (_, blockType, payload) => serializeGuidebookBlock(blockType as GuidebookBlockType, payload)
  );

  result = result.replace(
    /<(?:aside|div)[^>]*data-payload="([^"]*)"[^>]*data-guidebook="(trail_stop|workshop|cheat_sheet)"[^>]*>\s*<\/(?:aside|div)>/gi,
    (_, payload, blockType) => serializeGuidebookBlock(blockType as GuidebookBlockType, payload)
  );

  return result;
}

function prepareChapterContent(book: Book, content: string): string {
  let result = transformWidgetsForEpub(content);
  if (isKbpEnabled(book)) {
    result = applyKbpToHtml(result, book.kbpSettings);
  }
  return result;
}

function rewriteAssetPaths(html: string): string {
  return html.replace(/src="assets\/([^"]+)"/g, 'src="../images/$1"');
}

function collectAssetFilenames(book: Book, html: string): Set<string> {
  const filenames = new Set<string>();
  const matches = html.matchAll(/assets\/([^"'\s)]+)/g);
  for (const m of matches) filenames.add(m[1]);

  if (book.metadata.coverImage?.startsWith("assets/")) {
    filenames.add(book.metadata.coverImage.replace("assets/", ""));
  }
  return filenames;
}

async function embedAssets(
  zip: JSZip,
  book: Book,
  assetBlobs: Map<string, Blob> | undefined,
  htmlParts: string[]
): Promise<void> {
  const needed = new Set<string>();
  for (const html of htmlParts) {
    collectAssetFilenames(book, html).forEach((f) => needed.add(f));
  }

  const imagesFolder = zip.folder("images");
  for (const filename of needed) {
    const asset = getAssetByFilename(book, filename);
    if (!asset) continue;
    const blob = assetBlobs?.get(asset.id);
    if (blob) {
      imagesFolder?.file(filename, blob);
    }
  }
}

function coverXhtml(book: Book, coverImageId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>${escapeXml(book.metadata.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
  <style>
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; max-height: 100vh; }
  </style>
</head>
<body epub:type="cover">
  <img src="../images/${coverImageId}" alt="${escapeXml(book.metadata.title)}"/>
</body>
</html>`;
}

function chapterXhtml(book: Book, chapter: Chapter, index: number): string {
  const content = rewriteAssetPaths(prepareChapterContent(book, chapter.content));
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/main.css"/>
</head>
<body>
  <section epub:type="chapter" id="chapter-${index}">
    ${content}
  </section>
</body>
</html>`;
}

export { prepareChapterContent, transformWidgetsForEpub };

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

.guidebook-block {
  margin: 1.5em 0;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
}
.guidebook-block-header {
  padding: 0.6em 1em;
  font-size: 0.75em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.guidebook-block-body { padding: 1em; }
.guidebook-trail-stop { border-left: 4px solid #00a86b; }
.guidebook-trail-stop .guidebook-block-header { background: #f0faf5; color: #007a4d; }
.guidebook-workshop { border-left: 4px solid #c026d3; }
.guidebook-workshop .guidebook-block-header { background: #fdf4ff; color: #a21caf; }
.guidebook-cheat-sheet { border-left: 4px solid #0891b2; }
.guidebook-cheat-sheet .guidebook-block-header { background: #ecfeff; color: #0e7490; }
.cheat-grid { display: grid; gap: 0.35em 1em; }
.cheat-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.cheat-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.cheat-label { font-weight: 600; color: #0e7490; }
.workshop-exercise { margin: 0.6em 0; padding: 0.5em 0.75em; background: #faf5ff; border-radius: 4px; }
.response-hint { font-size: 0.85em; color: #888; font-style: italic; }
.trail-meta { font-size: 0.9em; color: #666; }
.trail-amenities { margin: 0.5em 0; padding-left: 1.25em; }
`;

export async function exportToEpub(
  book: Book,
  assetBlobs?: Map<string, Blob>
): Promise<Blob> {
  const zip = new JSZip();
  const { metadata, chapters } = book;
  const isFixed = book.layoutMode === "landscape";
  const useKbp = isKbpEnabled(book);
  const css = useKbp ? KBP_CSS + "\n" + MAIN_CSS.split("/* Interactive")[0] : MAIN_CSS;

  const coverFilename = book.metadata.coverImage?.startsWith("assets/")
    ? book.metadata.coverImage.replace("assets/", "")
    : null;
  const hasCover = Boolean(coverFilename);

  const chapterHtmlParts = chapters.map((ch) => prepareChapterContent(book, ch.content));
  await embedAssets(zip, book, assetBlobs, chapterHtmlParts);

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  const imageManifest = [...new Set(
    chapterHtmlParts.flatMap((html) => [...collectAssetFilenames(book, html)])
  )]
    .map((filename) => {
      const id = `img-${filename.replace(/[^a-z0-9]/gi, "-")}`;
      const coverProps =
        coverFilename === filename ? ' properties="cover-image"' : "";
      return `<item id="${id}" href="images/${filename}" media-type="image/jpeg"${coverProps}/>`;
    })
    .join("\n    ");

  const chapterManifest = chapters
    .map(
      (_, i) =>
        `<item id="chapter${i}" href="text/chapter${i}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join("\n    ");

  const coverManifest = hasCover
    ? `<item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>`
    : "";

  const spineItems = [
    hasCover ? `<itemref idref="cover" linear="no"/>` : "",
    ...chapters.map((_, i) => `<itemref idref="chapter${i}"/>`),
  ]
    .filter(Boolean)
    .join("\n    ");

  const navItems = [
    hasCover ? `<li><a href="text/cover.xhtml">Cover</a></li>` : "",
    ...chapters.map(
      (ch, i) =>
        `<li><a href="text/chapter${i}.xhtml">${escapeXml(ch.title)}</a></li>`
    ),
  ].join("\n        ");

  const coverMeta = hasCover
    ? `<meta name="cover" content="img-${coverFilename!.replace(/[^a-z0-9]/gi, "-")}"/>`
    : "";

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
    ${coverMeta}
    ${isFixed ? '<meta property="rendition:layout">pre-paginated</meta>' : '<meta property="rendition:layout">reflowable</meta>'}
  </metadata>
  <manifest>
    <item id="ncx" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="styles/main.css" media-type="text/css"/>
    ${coverManifest}
    ${imageManifest}
    ${chapterManifest}
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
  ${hasCover ? `<nav epub:type="landmarks" hidden=""><ol><li><a epub:type="cover" href="text/cover.xhtml">Cover</a></li></ol></nav>` : ""}
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
  if (hasCover && coverFilename) {
    textFolder?.file("cover.xhtml", coverXhtml(book, coverFilename));
  }
  chapters.forEach((chapter, i) => {
    textFolder?.file(`chapter${i}.xhtml`, chapterXhtml(book, chapter, i));
  });

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

export function downloadEpub(book: Book, assetBlobs?: Map<string, Blob>): Promise<void> {
  return exportToEpub(book, assetBlobs).then((blob) => {
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
