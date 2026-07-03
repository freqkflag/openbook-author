"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Images, ChevronLeft, ChevronRight } from "lucide-react";
import { useEditorAssetContext } from "@/context/EditorAssetContext";

export interface GalleryImage {
  src: string;
  caption: string;
}

export interface GalleryWidgetOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    galleryWidget: {
      setGalleryWidget: (attrs: { images: GalleryImage[] }) => ReturnType;
    };
  }
}

function GalleryWidgetView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const images: GalleryImage[] = (node.attrs.images as GalleryImage[]) || [];
  const [index, setIndex] = useState(0);
  const assetCtx = useEditorAssetContext();

  const current = images[index];

  const addImage = () => {
    assetCtx?.openAssetPicker((src, alt) => {
      updateAttributes({ images: [...images, { src, caption: alt || "" }] });
    }, "Add Gallery Image");
  };

  return (
    <NodeViewWrapper>
      <div
        className={`my-4 rounded-xl border overflow-hidden ${
          selected
            ? "border-fuchsia-500/50 shadow-[0_0_16px_rgba(217,70,239,0.2)]"
            : "border-purple-500/30"
        }`}
        data-widget="gallery"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border-b border-white/10">
          <Images size={16} className="text-purple-400" />
          <span className="text-sm text-purple-300 font-medium">Image Gallery</span>
          {selected && (
            <button
              type="button"
              onClick={addImage}
              className="ml-auto text-xs text-cyan-400 hover:text-cyan-300"
            >
              + Add image
            </button>
          )}
        </div>

        {images.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
            No images yet. Select widget and click &quot;+ Add image&quot;.
          </div>
        ) : (
          <div className="relative bg-[#0B1020]">
            {current && (
              <>
                <img
                  src={current.src}
                  alt={current.caption || "Gallery image"}
                  className="w-full max-h-64 object-contain"
                />
                {current.caption && (
                  <p className="px-4 py-2 text-xs text-slate-400 text-center italic">
                    {current.caption}
                  </p>
                )}
              </>
            )}
            {images.length > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs text-slate-500">
                  {index + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const GalleryWidget = Node.create<GalleryWidgetOptions>({
  name: "galleryWidget",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-images");
          try {
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({
          "data-images": JSON.stringify(attrs.images),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-widget="gallery"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-widget": "gallery",
        class: "gallery-widget",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryWidgetView);
  },

  addCommands() {
    return {
      setGalleryWidget:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
