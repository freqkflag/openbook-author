export type LayoutMode = "portrait" | "landscape";
export type BookTemplate = "portrait" | "landscape" | "textbook" | "guidebook" | "blank";
export type FormatProfile = "standard" | "kbp";

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
}

export interface Book {
  id: string;
  metadata: BookMetadata;
  template: BookTemplate;
  layoutMode: LayoutMode;
  formatProfile: FormatProfile;
  kbpSettings: KBPSettings;
  chapters: Chapter[];
  assets: BookAsset[];
  packagePath?: string;
  createdAt: string;
  updatedAt: string;
}

export type AIAction =
  | "continue"
  | "improve"
  | "outline"
  | "summarize"
  | "expand"
  | "rewrite"
  | "custom";

export interface AISettings {
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;
  model: string;
  baseUrl?: string;
}
