"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useState, useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { Book } from "@/types/book";
import AssetPicker from "@/components/AssetPicker";
import EditorLinkModal from "@/components/EditorLinkModal";
import EditorPopupModal from "@/components/EditorPopupModal";
import { EditorAssetContext } from "@/context/EditorAssetContext";
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
  MapPin,
  ClipboardList,
  FileText,
  Keyboard,
} from "lucide-react";
import { PopupWidget } from "@/components/extensions/PopupWidget";
import { GalleryWidget } from "@/components/extensions/GalleryWidget";
import { GuidebookBlock } from "@/components/extensions/GuidebookBlock";
import {
  TipCallout,
  WarningCallout,
  StepBlock,
  SceneBreak,
} from "@/components/extensions/KBPCallouts";
import type { GuidebookBlockType } from "@/types/guidebook";

interface RichEditorProps {
  book: Book;
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  kbpMode?: boolean;
  onShowShortcuts?: () => void;
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

export default function RichEditor({
  book,
  content,
  onChange,
  placeholder,
  kbpMode,
  onShowShortcuts,
}: RichEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("Choose Image");
  const [pickerHandler, setPickerHandler] = useState<((src: string, alt?: string) => void) | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalKey, setLinkModalKey] = useState(0);
  const [linkModalInitial, setLinkModalInitial] = useState({ url: "", label: "" });
  const [popupModalOpen, setPopupModalOpen] = useState(false);
  const [popupModalKey, setPopupModalKey] = useState(0);
  const editorRef = useRef<Editor | null>(null);

  const openAssetPicker = (onSelect: (src: string, alt?: string) => void, title?: string) => {
    setPickerTitle(title || "Choose Image");
    setPickerHandler(() => onSelect);
    setPickerOpen(true);
  };
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
      GuidebookBlock,
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onDestroy: () => {
      editorRef.current = null;
    },
    editorProps: {
      handleKeyDown: (_view, event) => {
        const ed = editorRef.current;
        if (!ed) return false;

        const mod = event.metaKey || event.ctrlKey;

        if (mod && event.key === "/" && onShowShortcuts) {
          event.preventDefault();
          onShowShortcuts();
          return true;
        }
        if (event.key === "?" && !mod && !event.altKey && onShowShortcuts) {
          event.preventDefault();
          onShowShortcuts();
          return true;
        }

        if (!mod) return false;

        const key = event.key.toLowerCase();
        const shift = event.shiftKey;
        const alt = event.altKey;

        if (key === "b" && !shift) {
          event.preventDefault();
          ed.chain().focus().toggleBold().run();
          return true;
        }
        if (key === "i" && !shift) {
          event.preventDefault();
          ed.chain().focus().toggleItalic().run();
          return true;
        }
        if (key === "u" && !shift) {
          event.preventDefault();
          ed.chain().focus().toggleUnderline().run();
          return true;
        }
        if (key === "s" && shift && !alt) {
          event.preventDefault();
          ed.chain().focus().toggleStrike().run();
          return true;
        }
        if (key === "h" && shift) {
          event.preventDefault();
          ed.chain().focus().toggleHighlight().run();
          return true;
        }
        if (alt && key === "1") {
          event.preventDefault();
          ed.chain().focus().toggleHeading({ level: 1 }).run();
          return true;
        }
        if (alt && key === "2") {
          event.preventDefault();
          ed.chain().focus().toggleHeading({ level: 2 }).run();
          return true;
        }
        if (alt && key === "3") {
          event.preventDefault();
          ed.chain().focus().toggleHeading({ level: 3 }).run();
          return true;
        }
        if (shift && key === "8") {
          event.preventDefault();
          ed.chain().focus().toggleBulletList().run();
          return true;
        }
        if (shift && key === "7") {
          event.preventDefault();
          ed.chain().focus().toggleOrderedList().run();
          return true;
        }
        if (shift && key === "b") {
          event.preventDefault();
          ed.chain().focus().toggleBlockquote().run();
          return true;
        }
        if (key === "z" && shift) {
          event.preventDefault();
          ed.chain().focus().redo().run();
          return true;
        }
        if (key === "z" && !shift) {
          event.preventDefault();
          ed.chain().focus().undo().run();
          return true;
        }
        return false;
      },
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[400px] focus:outline-none px-6 py-4 text-slate-200",
        spellcheck: "true",
        lang: book.metadata.language || "en",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  const guidebookBlocksEnabled = kbpMode || book.template === "guidebook";

  const insertGuidebookBlock = (blockType: GuidebookBlockType) => {
    editor.chain().focus().setGuidebookBlock({ blockType }).run();
  };

  const addImage = () => {
    openAssetPicker((src, alt) => {
      editor.chain().focus().setImage({ src, alt: alt || "" }).run();
    });
  };

  const openLinkModal = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "");
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    setLinkModalInitial({
      url: previousUrl || "",
      label: selectedText,
    });
    setLinkModalKey((k) => k + 1);
    setLinkModalOpen(true);
  };

  const applyLink = (url: string, label?: string) => {
    const { empty } = editor.state.selection;
    const chain = editor.chain().focus();
    if (!empty) {
      chain.extendMarkRange("link").setLink({ href: url }).run();
      return;
    }
    if (label) {
      chain.insertContent(`<a href="${url}">${label}</a>`).run();
      return;
    }
    chain.insertContent(`<a href="${url}">${url}</a>`).run();
  };

  const addPopup = () => {
    setPopupModalKey((k) => k + 1);
    setPopupModalOpen(true);
  };

  const applyPopup = (title: string, body: string) => {
    editor
      .chain()
      .focus()
      .setPopupWidget({ title, content: `<p>${body}</p>` })
      .run();
  };

  const addGallery = () => {
    openAssetPicker((src, alt) => {
      editor
        .chain()
        .focus()
        .setGalleryWidget({ images: [{ src, caption: alt || "" }] })
        .run();
    }, "Choose Gallery Image");
  };

  const nextStepNumber = () => {
    const html = editor.getHTML();
    const matches = html.match(/data-number="(\d+)"/g) || [];
    const nums = matches.map((m) => parseInt(m.match(/\d+/)?.[0] || "0", 10));
    return String((nums.length ? Math.max(...nums) : 0) + 1);
  };

  return (
    <EditorAssetContext.Provider value={{ openAssetPicker }}>
    <div className={`flex flex-col h-full rounded-xl border overflow-hidden backdrop-blur-sm ${
      kbpMode
        ? "border-fuchsia-500/20 bg-[#0B1020]/90"
        : "border-white/10 bg-[#0B1020]/80"
    }`}>
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-white/10 bg-[#121A2B]/60">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo (⌘⇧Z)">
          <Redo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => onShowShortcuts?.()}
          title="Keyboard shortcuts (⌘/)"
        >
          <Keyboard size={16} />
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
        <ToolbarButton onClick={openLinkModal} title="Add link">
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
        {guidebookBlocksEnabled && (
          <>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <ToolbarButton
              onClick={() => insertGuidebookBlock("trail_stop")}
              title="Insert trail stop"
            >
              <MapPin size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertGuidebookBlock("workshop")}
              title="Insert workshop block"
            >
              <ClipboardList size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertGuidebookBlock("cheat_sheet")}
              title="Insert cheat sheet"
            >
              <FileText size={16} />
            </ToolbarButton>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <AssetPicker
        book={book}
        open={pickerOpen}
        title={pickerTitle}
        onClose={() => setPickerOpen(false)}
        onSelect={(src, alt) => {
          pickerHandler?.(src, alt);
          setPickerOpen(false);
        }}
      />
      <EditorLinkModal
        key={linkModalKey}
        open={linkModalOpen}
        initialUrl={linkModalInitial.url}
        initialLabel={linkModalInitial.label}
        onClose={() => setLinkModalOpen(false)}
        onSubmit={applyLink}
      />
      <EditorPopupModal
        key={popupModalKey}
        open={popupModalOpen}
        onClose={() => setPopupModalOpen(false)}
        onSubmit={applyPopup}
      />
    </div>
    </EditorAssetContext.Provider>
  );
}
