export type GuidebookBlockType = "trail_stop" | "workshop" | "cheat_sheet";

export interface TrailStopAmenity {
  id: string;
  value: string;
}

export interface TrailStopPayload {
  name: string;
  mileMarker: string;
  elevation: string;
  notes: string;
  amenities: TrailStopAmenity[];
}

export interface WorkshopExercise {
  id: string;
  prompt: string;
  responseType: "short" | "long";
}

export interface WorkshopPayload {
  title: string;
  exercises: WorkshopExercise[];
}

export interface CheatSheetItem {
  id: string;
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

export function createListId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
    exercises: [{ id: createListId(), prompt: "Describe your experience.", responseType: "long" }],
  };
}

export function defaultCheatSheetPayload(): CheatSheetPayload {
  return {
    title: "Quick Reference",
    columns: 2,
    items: [{ id: createListId(), label: "Term", value: "Definition" }],
  };
}

/** Normalize persisted payloads (e.g. legacy string amenities, items missing ids). */
export function normalizeTrailStopPayload(data: Partial<TrailStopPayload> & { amenities?: unknown[] }): TrailStopPayload {
  const defaults = defaultTrailStopPayload();
  const amenities = (data.amenities ?? []).map((entry) => {
    if (typeof entry === "string") {
      return { id: createListId(), value: entry };
    }
    const amenity = entry as Partial<TrailStopAmenity>;
    return {
      id: amenity.id ?? createListId(),
      value: amenity.value ?? "",
    };
  });

  return {
    name: data.name ?? defaults.name,
    mileMarker: data.mileMarker ?? defaults.mileMarker,
    elevation: data.elevation ?? defaults.elevation,
    notes: data.notes ?? defaults.notes,
    amenities,
  };
}

export function normalizeWorkshopPayload(data: Partial<WorkshopPayload>): WorkshopPayload {
  const defaults = defaultWorkshopPayload();
  const exercises = (data.exercises ?? defaults.exercises).map((exercise) => ({
    id: exercise.id ?? createListId(),
    prompt: exercise.prompt ?? "",
    responseType: exercise.responseType ?? "short",
  }));

  return {
    title: data.title ?? defaults.title,
    exercises: exercises.length > 0 ? exercises : defaults.exercises,
  };
}

export function normalizeCheatSheetPayload(data: Partial<CheatSheetPayload>): CheatSheetPayload {
  const defaults = defaultCheatSheetPayload();
  const items = (data.items ?? defaults.items).map((item) => ({
    id: item.id ?? createListId(),
    label: item.label ?? "",
    value: item.value ?? "",
  }));

  return {
    title: data.title ?? defaults.title,
    columns: data.columns === 3 ? 3 : 2,
    items: items.length > 0 ? items : defaults.items,
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
    default:
      return { blockType: "trail_stop", data: defaultTrailStopPayload() };
  }
}
