"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { MapPin, ClipboardList, FileText, Plus, Trash2 } from "lucide-react";
import type {
  GuidebookBlockType,
  GuidebookBlockPayload,
  TrailStopPayload,
  WorkshopPayload,
  CheatSheetPayload,
  WorkshopExercise,
  CheatSheetItem,
} from "@/types/guidebook";
import { defaultGuidebookPayload, createListId, normalizeTrailStopPayload, normalizeWorkshopPayload, normalizeCheatSheetPayload } from "@/types/guidebook";

export interface GuidebookBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    guidebookBlock: {
      setGuidebookBlock: (attrs: { blockType: GuidebookBlockType }) => ReturnType;
    };
  }
}

function parsePayload(blockType: GuidebookBlockType, raw: string | null): GuidebookBlockPayload {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      switch (blockType) {
        case "trail_stop":
          return { blockType, data: normalizeTrailStopPayload(parsed) };
        case "workshop":
          return { blockType, data: normalizeWorkshopPayload(parsed) };
        case "cheat_sheet":
          return { blockType, data: normalizeCheatSheetPayload(parsed) };
      }
    } catch {
      /* fall through */
    }
  }
  return defaultGuidebookPayload(blockType);
}

const BLOCK_META: Record<
  GuidebookBlockType,
  { label: string; icon: typeof MapPin; accent: string; border: string; headerBg: string }
> = {
  trail_stop: {
    label: "Trail Stop",
    icon: MapPin,
    accent: "text-[#00FF88]",
    border: "border-[#00FF88]/30",
    headerBg: "bg-[#00FF88]/10",
  },
  workshop: {
    label: "Workshop",
    icon: ClipboardList,
    accent: "text-fuchsia-400",
    border: "border-fuchsia-500/30",
    headerBg: "bg-fuchsia-500/10",
  },
  cheat_sheet: {
    label: "Cheat Sheet",
    icon: FileText,
    accent: "text-cyan-400",
    border: "border-cyan-500/30",
    headerBg: "bg-cyan-500/10",
  },
};

const inputClass =
  "w-full bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600";
const labelClass = "block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5";

function TrailStopEditor({
  data,
  onChange,
}: {
  data: TrailStopPayload;
  onChange: (data: TrailStopPayload) => void;
}) {
  const updateAmenity = (id: string, value: string) => {
    onChange({
      ...data,
      amenities: data.amenities.map((amenity) =>
        amenity.id === id ? { ...amenity, value } : amenity
      ),
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <label className={labelClass}>Stop name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className={inputClass}
          aria-label="Trail stop name"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Mile marker</label>
          <input
            type="text"
            value={data.mileMarker}
            onChange={(e) => onChange({ ...data, mileMarker: e.target.value })}
            className={inputClass}
            aria-label="Mile marker"
          />
        </div>
        <div>
          <label className={labelClass}>Elevation</label>
          <input
            type="text"
            value={data.elevation}
            onChange={(e) => onChange({ ...data, elevation: e.target.value })}
            placeholder="e.g. 4,200 ft"
            className={inputClass}
            aria-label="Elevation"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          rows={2}
          className={`${inputClass} resize-none`}
          aria-label="Trail stop notes"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>Amenities</label>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...data,
                amenities: [...data.amenities, { id: createListId(), value: "" }],
              })
            }
            className="text-[10px] text-[#00FF88] hover:text-[#00FF88]/80 flex items-center gap-0.5"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {data.amenities.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No amenities listed.</p>
        ) : (
          <ul className="space-y-1">
            {data.amenities.map((amenity) => (
              <li key={amenity.id} className="flex gap-1">
                <input
                  type="text"
                  value={amenity.value}
                  onChange={(e) => updateAmenity(amenity.id, e.target.value)}
                  placeholder="Water, shelter, viewpoint…"
                  className={`${inputClass} flex-1`}
                  aria-label="Amenity"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...data,
                      amenities: data.amenities.filter((a) => a.id !== amenity.id),
                    })
                  }
                  className="p-1 text-slate-500 hover:text-red-400"
                  aria-label="Remove amenity"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WorkshopEditor({
  data,
  onChange,
}: {
  data: WorkshopPayload;
  onChange: (data: WorkshopPayload) => void;
}) {
  const updateExercise = (id: string, patch: Partial<WorkshopExercise>) => {
    onChange({
      ...data,
      exercises: data.exercises.map((exercise) =>
        exercise.id === id ? { ...exercise, ...patch } : exercise
      ),
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <label className={labelClass}>Workshop title</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className={inputClass}
          aria-label="Workshop title"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>Exercises</label>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...data,
                exercises: [
                  ...data.exercises,
                  { id: createListId(), prompt: "New exercise prompt.", responseType: "short" },
                ],
              })
            }
            className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-0.5"
          >
            <Plus size={12} /> Add exercise
          </button>
        </div>
        <ol className="space-y-2">
          {data.exercises.map((exercise, i) => (
            <li key={exercise.id} className="rounded-lg border border-white/10 p-2 bg-[#0B1020]/60">
              <div className="flex items-start gap-2">
                <span className="text-fuchsia-400 font-bold text-xs w-4 shrink-0 pt-1">{i + 1}.</span>
                <div className="flex-1 space-y-1">
                  <textarea
                    value={exercise.prompt}
                    onChange={(e) => updateExercise(exercise.id, { prompt: e.target.value })}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    aria-label={`Exercise ${i + 1} prompt`}
                  />
                  <select
                    value={exercise.responseType}
                    onChange={(e) =>
                      updateExercise(exercise.id, {
                        responseType: e.target.value as "short" | "long",
                      })
                    }
                    className={inputClass}
                    aria-label={`Exercise ${i + 1} response type`}
                  >
                    <option value="short">Short response</option>
                    <option value="long">Long response</option>
                  </select>
                </div>
                {data.exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...data,
                        exercises: data.exercises.filter((ex) => ex.id !== exercise.id),
                      })
                    }
                    className="p-1 text-slate-500 hover:text-red-400 shrink-0"
                    aria-label={`Remove exercise ${i + 1}`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function CheatSheetEditor({
  data,
  onChange,
}: {
  data: CheatSheetPayload;
  onChange: (data: CheatSheetPayload) => void;
}) {
  const updateItem = (id: string, patch: Partial<CheatSheetItem>) => {
    onChange({
      ...data,
      items: data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  return (
    <div className="space-y-2">
      <div>
        <label className={labelClass}>Sheet title</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          className={inputClass}
          aria-label="Cheat sheet title"
        />
      </div>
      <div>
        <label className={labelClass}>Columns</label>
        <select
          value={data.columns}
          onChange={(e) => onChange({ ...data, columns: Number(e.target.value) as 2 | 3 })}
          className={inputClass}
          aria-label="Column count"
        >
          <option value={2}>2 columns</option>
          <option value={3}>3 columns</option>
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass}>Items</label>
          <button
            type="button"
            onClick={() =>
              onChange({ ...data, items: [...data.items, { id: createListId(), label: "", value: "" }] })
            }
            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
          >
            <Plus size={12} /> Add row
          </button>
        </div>
        <ul className="space-y-1">
          {data.items.map((item, i) => (
            <li key={item.id} className="flex gap-1">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                placeholder="Label"
                className={`${inputClass} flex-1`}
                aria-label={`Row ${i + 1} label`}
              />
              <input
                type="text"
                value={item.value}
                onChange={(e) => updateItem(item.id, { value: e.target.value })}
                placeholder="Value"
                className={`${inputClass} flex-1`}
                aria-label={`Row ${i + 1} value`}
              />
              {data.items.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...data,
                      items: data.items.filter((row) => row.id !== item.id),
                    })
                  }
                  className="p-1 text-slate-500 hover:text-red-400"
                  aria-label={`Remove row ${i + 1}`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TrailStopPreview({ data }: { data: TrailStopPayload }) {
  return (
    <div className="text-sm text-slate-300 space-y-1">
      <p className="font-semibold text-[#00FF88]">{data.name || "Unnamed stop"}</p>
      <p className="text-xs text-slate-400">
        Mile {data.mileMarker || "—"}
        {data.elevation ? ` · ${data.elevation}` : ""}
      </p>
      {data.notes && <p className="text-xs">{data.notes}</p>}
      {data.amenities.filter((a) => a.value.trim()).length > 0 && (
        <ul className="text-xs text-slate-400 list-disc pl-4">
          {data.amenities
            .filter((a) => a.value.trim())
            .map((amenity) => (
              <li key={amenity.id}>{amenity.value}</li>
            ))}
        </ul>
      )}
    </div>
  );
}

function WorkshopPreview({ data }: { data: WorkshopPayload }) {
  return (
    <div className="text-sm space-y-2">
      <p className="font-semibold text-fuchsia-300">{data.title}</p>
      <ol className="space-y-2">
        {data.exercises.map((exercise, i) => (
          <li key={exercise.id} className="text-xs">
            <span className="text-fuchsia-400 font-bold">{i + 1}. </span>
            <span className="text-slate-300">{exercise.prompt}</span>
            <span className="ml-2 text-slate-500 italic">
              ({exercise.responseType === "long" ? "long answer" : "short answer"})
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CheatSheetPreview({ data }: { data: CheatSheetPayload }) {
  return (
    <div className="text-sm">
      <p className="font-semibold text-cyan-300 mb-2">{data.title}</p>
      <dl
        className={`grid gap-x-4 gap-y-1 text-xs ${
          data.columns === 3 ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {data.items.map((item) => (
          <div key={item.id} className="contents">
            <dt className="text-cyan-400/80 font-medium">{item.label || "—"}</dt>
            <dd className="text-slate-300 col-span-1">{item.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function GuidebookBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const blockType = (node.attrs.blockType as GuidebookBlockType) || "trail_stop";
  const payload = parsePayload(blockType, node.attrs.payload as string | null);
  const meta = BLOCK_META[blockType];
  const Icon = meta.icon;

  const updatePayload = (data: GuidebookBlockPayload["data"]) => {
    updateAttributes({ payload: JSON.stringify(data) });
  };

  const typeClass = `guidebook-${blockType.replace("_", "-")}`;

  return (
    <NodeViewWrapper>
      <aside
        className={`guidebook-block ${typeClass} my-4 rounded-xl border overflow-hidden transition-all ${
          selected
            ? "shadow-[0_0_16px_rgba(0,229,255,0.15)] ring-1 ring-cyan-500/30"
            : meta.border
        }`}
        data-guidebook={blockType}
        aria-label={`${meta.label} block`}
      >
        <header
          className={`flex items-center gap-2 px-4 py-2 border-b border-white/10 ${meta.headerBg}`}
        >
          <Icon size={16} className={meta.accent} aria-hidden />
          <span className={`text-sm font-medium ${meta.accent}`}>{meta.label}</span>
        </header>
        <div className="px-4 py-3 bg-[#0B1020]">
          {selected ? (
            <>
              {blockType === "trail_stop" && (
                <TrailStopEditor
                  data={payload.data as TrailStopPayload}
                  onChange={updatePayload}
                />
              )}
              {blockType === "workshop" && (
                <WorkshopEditor
                  data={payload.data as WorkshopPayload}
                  onChange={updatePayload}
                />
              )}
              {blockType === "cheat_sheet" && (
                <CheatSheetEditor
                  data={payload.data as CheatSheetPayload}
                  onChange={updatePayload}
                />
              )}
            </>
          ) : (
            <>
              {blockType === "trail_stop" && (
                <TrailStopPreview data={payload.data as TrailStopPayload} />
              )}
              {blockType === "workshop" && (
                <WorkshopPreview data={payload.data as WorkshopPayload} />
              )}
              {blockType === "cheat_sheet" && (
                <CheatSheetPreview data={payload.data as CheatSheetPayload} />
              )}
            </>
          )}
        </div>
      </aside>
    </NodeViewWrapper>
  );
}

export const GuidebookBlock = Node.create<GuidebookBlockOptions>({
  name: "guidebookBlock",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      blockType: {
        default: "trail_stop" as GuidebookBlockType,
        parseHTML: (el) => el.getAttribute("data-guidebook") || "trail_stop",
        renderHTML: (attrs) => ({ "data-guidebook": attrs.blockType }),
      },
      payload: {
        default: JSON.stringify(defaultGuidebookPayload("trail_stop").data),
        parseHTML: (el) => el.getAttribute("data-payload") || "",
        renderHTML: (attrs) => ({ "data-payload": attrs.payload }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-guidebook]' }, { tag: 'div[data-guidebook]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const blockType = node.attrs.blockType as GuidebookBlockType;
    const typeClass = `guidebook-${blockType.replace("_", "-")}`;
    return [
      "aside",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-guidebook": blockType,
        "data-payload": node.attrs.payload,
        class: `guidebook-block ${typeClass}`,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GuidebookBlockView);
  },

  addCommands() {
    return {
      setGuidebookBlock:
        ({ blockType }) =>
        ({ commands }) => {
          const defaults = defaultGuidebookPayload(blockType);
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockType,
              payload: JSON.stringify(defaults.data),
            },
          });
        },
    };
  },
});
