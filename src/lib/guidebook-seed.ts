import type {
  GuidebookBlockType,
  TrailStopPayload,
  WorkshopPayload,
  CheatSheetPayload,
} from "@/types/guidebook";
import {
  defaultGuidebookPayload,
  normalizeTrailStopPayload,
  normalizeWorkshopPayload,
  normalizeCheatSheetPayload,
} from "@/types/guidebook";

/** Stable IDs for seed payloads — survive save/load and keep tests deterministic. */
export const SEED_IDS = {
  amenityWater: "seed-amenity-water",
  amenityViewpoint: "seed-amenity-viewpoint",
  amenityShelter: "seed-amenity-shelter",
  exerciseReflect: "seed-exercise-reflect",
  exerciseGoals: "seed-exercise-goals",
  cheatDifficulty: "seed-cheat-difficulty",
  cheatHours: "seed-cheat-hours",
  cheatPermit: "seed-cheat-permit",
  cheatSeason: "seed-cheat-season",
} as const;

export const seedTrailStopPayload: TrailStopPayload = {
  name: "Summit Vista Overlook",
  mileMarker: "4.2",
  elevation: "3,840 ft",
  notes:
    "Panoramic views of the valley below. Best visited at sunrise when the ridgeline catches golden light.",
  amenities: [
    { id: SEED_IDS.amenityWater, value: "Seasonal stream (filter required)" },
    { id: SEED_IDS.amenityViewpoint, value: "360° observation deck" },
    { id: SEED_IDS.amenityShelter, value: "Stone windbreak" },
  ],
};

export const seedWorkshopPayload: WorkshopPayload = {
  title: "Trail Reflection Workshop",
  exercises: [
    {
      id: SEED_IDS.exerciseReflect,
      prompt: "What surprised you most on the approach to this overlook?",
      responseType: "long",
    },
    {
      id: SEED_IDS.exerciseGoals,
      prompt: "List one skill you want to practice on your next hike.",
      responseType: "short",
    },
  ],
};

export const seedCheatSheetPayload: CheatSheetPayload = {
  title: "Trail Quick Reference",
  columns: 2,
  items: [
    { id: SEED_IDS.cheatDifficulty, label: "Difficulty", value: "Moderate (steep final 0.5 mi)" },
    { id: SEED_IDS.cheatHours, label: "Typical time", value: "3–4 hours round trip" },
    { id: SEED_IDS.cheatPermit, label: "Permit", value: "Day-use pass required" },
    { id: SEED_IDS.cheatSeason, label: "Best season", value: "May–October" },
  ],
};

function encodePayloadForHtmlAttr(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

/** Serialize a guidebook block to the HTML shape TipTap GuidebookBlock parseHTML expects. */
export function serializeGuidebookBlockToHtml(
  blockType: GuidebookBlockType,
  payload?: TrailStopPayload | WorkshopPayload | CheatSheetPayload
): string {
  const slug = blockType.replace("_", "-");
  let data: TrailStopPayload | WorkshopPayload | CheatSheetPayload;

  if (payload !== undefined) {
    switch (blockType) {
      case "trail_stop":
        data = normalizeTrailStopPayload(payload as TrailStopPayload);
        break;
      case "workshop":
        data = normalizeWorkshopPayload(payload as WorkshopPayload);
        break;
      case "cheat_sheet":
        data = normalizeCheatSheetPayload(payload as CheatSheetPayload);
        break;
    }
  } else {
    data = defaultGuidebookPayload(blockType).data;
  }

  const encoded = encodePayloadForHtmlAttr(data);
  return `<aside data-guidebook="${blockType}" data-payload="${encoded}" class="guidebook-block guidebook-${slug}"></aside>`;
}

export function buildGettingStartedChapterContent(): string {
  const trailStop = serializeGuidebookBlockToHtml("trail_stop", seedTrailStopPayload);
  const workshop = serializeGuidebookBlockToHtml("workshop", seedWorkshopPayload);
  const cheatSheet = serializeGuidebookBlockToHtml("cheat_sheet", seedCheatSheetPayload);

  return `<h1>Chapter 1: Getting Started</h1>
<p>Begin your first topic here. Guidebook chapters work best with a short overview, then structured blocks that readers can scan at a glance.</p>
<h2>Featured Trail Stop</h2>
<p>Use trail stop blocks to mark waypoints with mile markers, elevation, and amenities.</p>
${trailStop}
<h2>Reflection Workshop</h2>
<p>Workshop blocks give readers space to reflect with guided prompts — great for field journals and training manuals.</p>
${workshop}
<h2>Quick Reference</h2>
<p>Cheat sheet blocks pack label/value pairs into a compact grid for at-a-glance facts.</p>
${cheatSheet}
<div data-callout="tip" data-text="Edit any block inline, or insert new ones from the Guidebook section of the toolbar."></div>`;
}

export function buildTrailReferenceChapterContent(): string {
  const trailStop = serializeGuidebookBlockToHtml("trail_stop", {
    ...seedTrailStopPayload,
    name: "Creek Crossing Junction",
    mileMarker: "1.8",
    elevation: "2,100 ft",
    notes: "Last reliable water source before the climb. Check flow after dry spells.",
    amenities: [
      { id: SEED_IDS.amenityWater, value: "Footbridge and fill station" },
    ],
  });
  const workshop = serializeGuidebookBlockToHtml("workshop", {
    title: "Navigation Check",
    exercises: [
      {
        id: SEED_IDS.exerciseReflect,
        prompt: "Confirm your map bearing matches the trail marker here.",
        responseType: "short",
      },
    ],
  });
  const cheatSheet = serializeGuidebookBlockToHtml("cheat_sheet", seedCheatSheetPayload);

  return `<h1>Trail Reference</h1>
<p class="no-indent">This chapter demonstrates all three guidebook block types side by side. Use it as a layout reference when building your own trail sections.</p>
${trailStop}
${workshop}
${cheatSheet}`;
}
