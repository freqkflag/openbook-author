"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  MessageSquare,
  Images,
  Lightbulb,
  AlertTriangle,
  Minus,
} from "lucide-react";
import { PopupWidget } from "@/components/extensions/PopupWidget";
import { GalleryWidget } from "@/components/extensions/GalleryWidget";
import {
  TipCallout,
  WarningCallout,
  StepBlock,
  SceneBreak,
} from "@/components/extensions/KBPCallouts";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  kbpMode?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-all ${
        active
          ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.3)]"
          : "text-slate-400 hover:text-cyan-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichEditor({ content, onChange, placeholder, kbpMode }: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      PopupWidget,
      GalleryWidget,
      TipCallout,
      WarningCallout,
      StepBlock,
      SceneBreak,
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] focus:outline-none px-6 py-4 text-slate-200",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = window.prompt("Link URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addPopup = () => {
    const title = window.prompt("Popup title:", "Tap to reveal") || "Tap to reveal";
    const text = window.prompt("Popup content:", "Hidden content goes here.") || "";
    editor
      .chain()
      .focus()
      .setPopupWidget({ title, content: `<p>${text}</p>` })
      .run();
  };

  const addGallery = () => {
    const url = window.prompt("First image URL:");
    if (!url) return;
    const caption = window.prompt("Caption (optional):") || "";
    editor
      .chain()
      .focus()
      .setGalleryWidget({ images: [{ src: url, caption }] })
      .run();
  };

  const nextStepNumber = () => {
    const html = editor.getHTML();
    const matches = html.match(/data-number="(\d+)"/g) || [];
    const nums = matches.map((m) => parseInt(m.match(/\d+/)?.[0] || "0", 10));
    return String((nums.length ? Math.max(...nums) : 0) + 1);
  };

  return (
    <div className={`flex flex-col h-full rounded-xl border overflow-hidden backdrop-blur-sm ${
      kbpMode
        ? "border-fuchsia-500/20 bg-[#0B1020]/90"
        : "border-white/10 bg-[#0B1020]/80"
    }`}>
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-white/10 bg-[#121A2B]/60">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Highlight"
        >
          <Highlighter size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align left"
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align center"
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align right"
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton onClick={addLink} title="Add link">
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Add image">
          <ImageIcon size={16} />
        </ToolbarButton>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton onClick={addPopup} title="Insert popup widget">
          <MessageSquare size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={addGallery} title="Insert image gallery">
          <Images size={16} />
        </ToolbarButton>
        {(kbpMode) && (
          <>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTipCallout({ text: "Helpful tip goes here." }).run()
              }
              title="Insert tip callout"
            >
              <Lightbulb size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setWarningCallout({ text: "Important note or warning." })
                  .run()
              }
              title="Insert warning callout"
            >
              <AlertTriangle size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setStepBlock({ number: nextStepNumber(), text: "Describe this step." })
                  .run()
              }
              title="Insert step block"
            >
              <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setSceneBreak().run()}
              title="Insert scene break"
            >
              <Minus size={16} />
            </ToolbarButton>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
