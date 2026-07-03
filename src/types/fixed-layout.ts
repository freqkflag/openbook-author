export type FixedSpreadElementType = "text" | "image";

export interface FixedSpreadElement {
  id: string;
  type: FixedSpreadElementType;
  /** Position and size as percentage of spread (0–100) */
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize?: number;
}

export interface FixedSpread {
  width: number;
  height: number;
  background?: string;
  elements: FixedSpreadElement[];
}

export const DEFAULT_FIXED_SPREAD: FixedSpread = {
  width: 1024,
  height: 768,
  background: "#05070D",
  elements: [],
};

export type ChapterEditorMode = "reflow" | "fixed";
