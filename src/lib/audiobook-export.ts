import JSZip from "jszip";
import type { Book, Chapter } from "@/types/book";
export interface AudiobookManifestChapter {
  title: string;
  href: string;
  duration?: string;
}

/** W3C Audiobook / Readium LPF-style manifest export (Wave C #6) */
export async function exportAudiobookManifest(
  book: Book,
  audioFiles: Map<string, Blob> = new Map()
): Promise<Blob> {
  const zip = new JSZip();
  const prefix = book.metadata.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "audiobook";

  const readingOrder = book.chapters.map((ch, i) => ({
    type: "chapter",
    title: ch.title,
    href: `audio/chapter-${i}.mp3`,
    duration: estimateDuration(ch),
  }));

  const manifest = {
    "@context": "https://readium.org/webpub-manifest/context.jsonld",
    metadata: {
      "@type": "http://schema.org/Audiobook",
      title: book.metadata.title,
      author: book.metadata.author,
      language: book.metadata.language || "en",
      identifier: `urn:uuid:${book.id}`,
      modified: book.updatedAt,
    },
    readingOrder,
    resources: readingOrder.map((item) => ({
      href: item.href,
      type: "audio/mpeg",
    })),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        conformsTo: "https://www.w3.org/TR/audiobooks/",
        generator: "OpenBook Author",
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  const audioFolder = zip.folder("audio");
  book.chapters.forEach((ch, i) => {
    const blob = audioFiles.get(ch.id);
    if (blob) {
      audioFolder?.file(`chapter-${i}.mp3`, blob);
    } else {
      audioFolder?.file(
        `chapter-${i}.txt`,
        `Placeholder — attach narration for: ${ch.title}\n\n${stripHtml(ch.content).slice(0, 500)}`
      );
    }
  });

  zip.file(
    "README.txt",
    [
      "OpenBook Author — Audiobook manifest export",
      "",
      "This package follows W3C Audiobook manifest conventions.",
      "Replace audio/chapter-*.mp3 with mastered narration files.",
      "",
      `Book: ${book.metadata.title}`,
      `Chapters: ${book.chapters.length}`,
    ].join("\n")
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

function estimateDuration(chapter: Chapter): string {
  const words = stripHtml(chapter.content).split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(60, Math.round((words / 150) * 60));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `PT${m}M${s}S`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function downloadAudiobookManifest(book: Book, audioFiles?: Map<string, Blob>): Promise<void> {
  return exportAudiobookManifest(book, audioFiles).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${book.metadata.title || "audiobook"}-lpf.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
