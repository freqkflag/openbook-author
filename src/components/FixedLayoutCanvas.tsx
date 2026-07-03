"use client";

import { v4 as uuidv4 } from "uuid";
import type { FixedSpread, FixedSpreadElement } from "@/types/fixed-layout";
import { DEFAULT_FIXED_SPREAD } from "@/types/fixed-layout";
import { Plus, Type, Image as ImageIcon } from "lucide-react";

interface FixedLayoutCanvasProps {
  spread: FixedSpread;
  onChange: (spread: FixedSpread) => void;
}

export default function FixedLayoutCanvas({ spread, onChange }: FixedLayoutCanvasProps) {
  const data = spread ?? DEFAULT_FIXED_SPREAD;

  const updateElement = (id: string, patch: Partial<FixedSpreadElement>) => {
    onChange({
      ...data,
      elements: data.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    });
  };

  const addElement = (type: FixedSpreadElement["type"]) => {
    const el: FixedSpreadElement = {
      id: uuidv4(),
      type,
      x: 10,
      y: 10,
      width: type === "text" ? 40 : 30,
      height: type === "text" ? 20 : 25,
      content: type === "text" ? "Headline" : "assets/placeholder.png",
      fontSize: 24,
    };
    onChange({ ...data, elements: [...data.elements, el] });
  };

  const removeElement = (id: string) => {
    onChange({ ...data, elements: data.elements.filter((el) => el.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => addElement("text")}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-cyan-500/30 text-cyan-300"
        >
          <Type size={12} /> Text
        </button>
        <button
          type="button"
          onClick={() => addElement("image")}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-purple-500/30 text-purple-300"
        >
          <ImageIcon size={12} /> Image
        </button>
        <span className="text-xs text-slate-500 ml-auto">
          {data.width}×{data.height}px spread
        </span>
      </div>

      <div
        className="relative flex-1 min-h-[320px] rounded-xl border border-cyan-500/20 overflow-hidden"
        style={{ background: data.background ?? "#05070D", aspectRatio: `${data.width}/${data.height}` }}
      >
        {data.elements.map((el) => (
          <div
            key={el.id}
            className="absolute border border-dashed border-cyan-500/40 rounded p-1"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              height: `${el.height}%`,
            }}
          >
            {el.type === "text" ? (
              <span style={{ fontSize: el.fontSize ?? 16 }} className="text-white leading-tight">
                {el.content}
              </span>
            ) : (
              <div className="w-full h-full bg-purple-500/10 flex items-center justify-center text-[10px] text-purple-300 truncate px-1">
                {el.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {data.elements.map((el) => (
          <div key={el.id} className="grid grid-cols-6 gap-1 items-center text-xs">
            <span className="text-slate-400 capitalize col-span-1">{el.type}</span>
            <input
              type="number"
              value={el.x}
              onChange={(e) => updateElement(el.id, { x: Number(e.target.value) })}
              className="bg-[#0B1020] border border-white/10 rounded px-1 py-0.5 text-white"
              title="X %"
            />
            <input
              type="number"
              value={el.y}
              onChange={(e) => updateElement(el.id, { y: Number(e.target.value) })}
              className="bg-[#0B1020] border border-white/10 rounded px-1 py-0.5 text-white"
              title="Y %"
            />
            <input
              type="text"
              value={el.content}
              onChange={(e) => updateElement(el.id, { content: e.target.value })}
              className="col-span-2 bg-[#0B1020] border border-white/10 rounded px-1 py-0.5 text-white"
            />
            <button
              type="button"
              onClick={() => removeElement(el.id)}
              className="text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        ))}
        {data.elements.length === 0 && (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Plus size={12} /> Add text or image blocks to build a fixed spread.
          </p>
        )}
      </div>
    </div>
  );
}
