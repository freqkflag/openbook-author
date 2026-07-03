"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { MessageSquare } from "lucide-react";

export interface PopupWidgetOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    popupWidget: {
      setPopupWidget: (attrs: { title: string; content: string }) => ReturnType;
    };
  }
}

function PopupWidgetView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const [open, setOpen] = useState(false);
  const title = (node.attrs.title as string) || "Tap to reveal";
  const content = (node.attrs.content as string) || "<p>Hidden content goes here.</p>";

  return (
    <NodeViewWrapper>
      <div
        className={`my-4 rounded-xl border overflow-hidden transition-all ${
          selected
            ? "border-fuchsia-500/50 shadow-[0_0_16px_rgba(217,70,239,0.2)]"
            : "border-cyan-500/30"
        }`}
        data-widget="popup"
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-sm font-medium transition-colors"
        >
          <MessageSquare size={16} />
          {title || "Tap to reveal"}
          <span className="ml-auto text-xs text-slate-500">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div
            className="px-4 py-3 bg-[#0B1020] text-slate-300 text-sm prose prose-invert prose-sm max-w-none border-t border-white/10"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        {selected && (
          <div className="px-4 py-2 border-t border-white/10 bg-[#121A2B]/60 space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              placeholder="Popup title"
              className="w-full bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <textarea
              value={content.replace(/<[^>]*>/g, "")}
              onChange={(e) => updateAttributes({ content: `<p>${e.target.value}</p>` })}
              placeholder="Popup content"
              rows={3}
              className="w-full bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-xs text-white resize-none"
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const PopupWidget = Node.create<PopupWidgetOptions>({
  name: "popupWidget",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      title: { default: "Tap to reveal" },
      content: { default: "<p>Hidden content goes here.</p>" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-widget="popup"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-widget": "popup",
        "data-title": node.attrs.title,
        "data-content": node.attrs.content,
        class: "popup-widget",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PopupWidgetView);
  },

  addCommands() {
    return {
      setPopupWidget:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
