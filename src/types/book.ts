export type LayoutMode = "portrait" | "landscape";
export type BookTemplate = "portrait" | "landscape" | "textbook" | "guidebook" | "blank";
export type FormatProfile = "standard" | "kbp";

export type ExportThemeId =
  | "classic-serif"
  | "modern-sans"
  | "textbook"
  | "guidebook"
  | "minimal";

export interface ExportThemeSettings {
  themeId: ExportThemeId;
  /** Advanced override appended after built-in theme CSS */
  customCss?: string;
}

export const DEFAULT_EXPORT_THEME: ExportThemeSettings = {
  themeId: "classic-serif",
};

export interface KBPSettings {
  enabled: boolean;
  firstLineIndent: boolean;
  dropCaps: boolean;
  sceneBreakStyle: "asterisks" | "line" | "ornament";
  chapterNumbering: boolean;
}

export const DEFAULT_KBP_SETTINGS: KBPSettings = {
  enabled: false,
  firstLineIndent: true,
  dropCaps: false,
  sceneBreakStyle: "asterisks",
  chapterNumbering: true,
};

export type ChapterSectionType =
  | "chapter"
  | "copyright"
  | "dedication"
  | "indented"
  | "introduction"
  | "appendix"
  | "journal"
  | "workbook"
  | "checklist"
  | "reflection"
  | "quote"
  | "photo-spread"
  | "timeline"
  | "glossary"
  | "interview"
  | "takeaways"
  | "resources"
  | "learning-objectives"
  | "practice-quiz"
  | "bibliography";

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  sectionType?: ChapterSectionType;
  /** Fixed-layout spread (ADR-0007) — when set, chapter exports as pre-paginated spread */
  fixedSpread?: import("@/types/fixed-layout").FixedSpread;
  editorMode?: import("@/types/fixed-layout").ChapterEditorMode;
}

/** Volume/part grouping for hierarchical table of contents */
export interface BookPart {
  id: string;
  title: string;
  order: number;
  chapterIds: string[];
}

export interface BookAsset {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  alt?: string;
  createdAt: string;
}

export interface BookMetadata {
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  language: string;
  description: string;
  coverImage?: string;
  /** Store listing — optional ISBN (978… or 979…) */
  isbn?: string;
  /** BISAC subject codes or category labels */
  bisac?: string[];
  /** Store search keywords */
  keywords?: string[];
  /** e.g. "All Ages", "12+", "18+" */
  ageRating?: string;
  series?: string;
  seriesIndex?: number;
  /** EPUB schema:accessibilitySummary — human-readable a11y description */
  accessibilitySummary?: string;
  /** EPUB schema:certifierCredential — certification standard or claim */
  accessibilityClaim?: string;
  /** EPUB schema:certifier — organization that certified accessibility */
  accessibilityCertifier?: string;
}

/** Backward-compatible defaults for books saved before store metadata shipped */
export function normalizeBookMetadata(metadata: Partial<BookMetadata> = {}): BookMetadata {
  return {
    title: metadata.title ?? "",
    subtitle: metadata.subtitle ?? "",
    author: metadata.author ?? "",
    publisher: metadata.publisher ?? "",
    language: metadata.language ?? "en",
    description: metadata.description ?? "",
    coverImage: metadata.coverImage,
    isbn: metadata.isbn ?? "",
    bisac: metadata.bisac ?? [],
    keywords: metadata.keywords ?? [],
    ageRating: metadata.ageRating ?? "",
    series: metadata.series ?? "",
    seriesIndex: metadata.seriesIndex,
    accessibilitySummary: metadata.accessibilitySummary ?? "",
    accessibilityClaim: metadata.accessibilityClaim ?? "",
    accessibilityCertifier: metadata.accessibilityCertifier ?? "",
  };
}

export interface Book {
  id: string;
  metadata: BookMetadata;
  template: BookTemplate;
  layoutMode: LayoutMode;
  formatProfile: FormatProfile;
  kbpSettings: KBPSettings;
  exportTheme?: ExportThemeSettings;
  chapters: Chapter[];
  /** Optional parts/volumes — omitted in legacy flat .openbook files */
  parts?: BookPart[];
  assets: BookAsset[];
  /** Package mode — single `.openbook` zip path (default) */
  packagePath?: string;
  /** Folder mode — project directory path (ADR-0005) */
  projectPath?: string;
  storageMode?: "package" | "folder";
  createdAt: string;
  updatedAt: string;
}

export type AIAction =
  | "continue"
  | "improve"
  | "outline"
  | "consistency-check"
  | "summarize"
  | "expand"
  | "rewrite"
  | "generate-section"
  | "custom";

export interface AISettings {
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** Short tone label, e.g. "conversational travel guide" */
  voiceProfile?: string;
  /** Longer style rules the AI should follow */
  styleGuide?: string;
}
