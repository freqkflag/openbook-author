"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { v4 as uuidv4 } from "uuid";
import { encodeNoteContent } from "@/lib/note-export";

export type NoteType = "footnote" | "endnote";

export interface NoteReferenceOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noteReference: {
      insertNoteReference: (attrs: {
        noteType: NoteType;
        content: string;
        id?: string;
      }) => ReturnType;
    };
  }
}

function NoteReferenceView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const noteType = (node.attrs.noteType as NoteType) || "footnote";
  const content = (node.attrs.content as string) || "";
  const label = noteType === "footnote" ? "fn" : "en";

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className={`note-ref inline align-baseline cursor-pointer rounded px-0.5 transition-colors ${
          selected
            ? "bg-cyan-500/30 text-cyan-200 ring-1 ring-cyan-400/50"
            : "text-cyan-400 hover:bg-cyan-500/15"
        }`}
        title={content || `${noteType} (empty)`}
        data-note={noteType}
      >
        <sup className="text-[0.7em] font-semibold not-italic">{label}</sup>
      </span>
      {selected && (
        <span
          contentEditable={false}
          className="block mt-2 mb-2 p-2 rounded-lg border border-white/10 bg-[#121A2B] text-xs text-slate-300 max-w-md"
        >
          <label className="block text-slate-500 mb-1">
            {noteType === "footnote" ? "Footnote" : "Endnote"} text
          </label>
          <textarea
            value={content}
            onChange={(e) => updateAttributes({ content: e.target.value })}
            rows={3}
            className="w-full bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-white resize-none"
            placeholder="Note content…"
          />
        </span>
      )}
    </NodeViewWrapper>
  );
}

export const NoteReference = Node.create<NoteReferenceOptions>({
  name: "noteReference",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      noteType: { default: "footnote" as NoteType },
      id: { default: null },
      content: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-note]',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const noteType = el.getAttribute("data-note");
          if (noteType !== "footnote" && noteType !== "endnote") return false;
          return {
            noteType,
            id: el.getAttribute("data-id"),
            content: el.getAttribute("data-content") ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const noteType = (node.attrs.noteType as NoteType) || "footnote";
    const id = (node.attrs.id as string) || "";
    const content = encodeNoteContent((node.attrs.content as string) || "");
    const label = noteType === "footnote" ? "fn" : "en";
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-note": noteType,
        "data-id": id,
        "data-content": content,
        class: "note-ref",
      }),
      ["sup", {}, label],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteReferenceView);
  },

  addCommands() {
    return {
      insertNoteReference:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              noteType: attrs.noteType,
              content: attrs.content,
              id: attrs.id ?? uuidv4(),
            },
          }),
    };
  },
});
