export type GuidebookBlockType = "trail_stop" | "workshop" | "cheat_sheet";

export interface TrailStopPayload {
  name: string;
  mileMarker: string;
  elevation: string;
  notes: string;
  amenities: string[];
}

export interface WorkshopExercise {
  prompt: string;
  responseType: "short" | "long";
}

export interface WorkshopPayload {
  title: string;
  exercises: WorkshopExercise[];
}

export interface CheatSheetItem {
  label: string;
  value: string;
}

export interface CheatSheetPayload {
  title: string;
  columns: 2 | 3;
  items: CheatSheetItem[];
}

export type GuidebookBlockPayload =
  | { blockType: "trail_stop"; data: TrailStopPayload }
  | { blockType: "workshop"; data: WorkshopPayload }
  | { blockType: "cheat_sheet"; data: CheatSheetPayload };

export function defaultTrailStopPayload(): TrailStopPayload {
  return {
    name: "Trail Stop",
    mileMarker: "0.0",
    elevation: "",
    notes: "",
    amenities: [],
  };
}

export function defaultWorkshopPayload(): WorkshopPayload {
  return {
    title: "Workshop",
    exercises: [{ prompt: "Describe your experience.", responseType: "long" }],
  };
}

export function defaultCheatSheetPayload(): CheatSheetPayload {
  return {
    title: "Quick Reference",
    columns: 2,
    items: [{ label: "Term", value: "Definition" }],
  };
}

export function defaultGuidebookPayload(blockType: GuidebookBlockType): GuidebookBlockPayload {
  switch (blockType) {
    case "trail_stop":
      return { blockType, data: defaultTrailStopPayload() };
    case "workshop":
      return { blockType, data: defaultWorkshopPayload() };
    case "cheat_sheet":
      return { blockType, data: defaultCheatSheetPayload() };
  }
}
