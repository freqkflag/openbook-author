"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Headphones, Video } from "lucide-react";
import { useEditorAssetContext } from "@/context/EditorAssetContext";

export type MediaKind = "audio" | "video";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mediaWidget: {
      setMediaWidget: (attrs: { kind: MediaKind; src: string; title?: string }) => ReturnType;
    };
  }
}

function MediaWidgetView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const kind = (node.attrs.kind as MediaKind) || "audio";
  const src = (node.attrs.src as string) || "";
  const title = (node.attrs.title as string) || "";
  const assetCtx = useEditorAssetContext();

  return (
    <NodeViewWrapper>
      <div
        className={`my-4 rounded-xl border p-4 ${
          selected ? "border-fuchsia-500/50" : "border-cyan-500/30"
        }`}
        data-widget="media"
        data-kind={kind}
        data-src={src}
        data-title={title}
      >
        <div className="flex items-center gap-2 mb-2">
          {kind === "audio" ? (
            <Headphones size={16} className="text-cyan-400" />
          ) : (
            <Video size={16} className="text-purple-400" />
          )}
          <span className="text-sm text-white capitalize">{kind} widget</span>
          {selected && (
            <button
              type="button"
              onClick={() =>
                assetCtx?.openAssetPicker((picked) => updateAttributes({ src: picked }), "Select media")
              }
              className="ml-auto text-xs text-cyan-400"
            >
              Pick asset
            </button>
          )}
        </div>
        {selected && (
          <input
            type="text"
            value={title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            placeholder="Caption"
            className="w-full mb-2 bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-xs text-white"
          />
        )}
        <p className="text-xs text-slate-500 truncate">{src || "No media selected"}</p>
      </div>
    </NodeViewWrapper>
  );
}

export const MediaWidget = Node.create({
  name: "mediaWidget",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      kind: { default: "audio" },
      src: { default: "" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-widget="media"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-widget": "media",
        "data-kind": HTMLAttributes.kind,
        "data-src": HTMLAttributes.src,
        "data-title": HTMLAttributes.title,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaWidgetView);
  },

  addCommands() {
    return {
      setMediaWidget:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
