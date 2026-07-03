"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Lightbulb, AlertTriangle } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tipCallout: { setTipCallout: (attrs: { text: string }) => ReturnType };
    warningCallout: { setWarningCallout: (attrs: { text: string }) => ReturnType };
    stepBlock: { setStepBlock: (attrs: { number: string; text: string }) => ReturnType };
    sceneBreak: { setSceneBreak: () => ReturnType };
  }
}

function TipCalloutView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const text = (node.attrs.text as string) || "Enter tip text...";
  return (
    <NodeViewWrapper>
      <div
        className={`my-3 rounded-lg border-l-4 border-green-400 bg-green-500/10 px-4 py-3 ${
          selected ? "ring-1 ring-green-400/50" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-green-400 shrink-0 mt-0.5" />
          {selected ? (
            <textarea
              value={text}
              onChange={(e) => updateAttributes({ text: e.target.value })}
              rows={2}
              className="flex-1 bg-transparent text-sm text-green-200 outline-none resize-none"
            />
          ) : (
            <p className="text-sm text-green-200">
              <strong className="text-green-400">TIP: </strong>
              {text}
            </p>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function WarningCalloutView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const text = (node.attrs.text as string) || "Enter warning text...";
  return (
    <NodeViewWrapper>
      <div
        className={`my-3 rounded-lg border-l-4 border-orange-400 bg-orange-500/10 px-4 py-3 ${
          selected ? "ring-1 ring-orange-400/50" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
          {selected ? (
            <textarea
              value={text}
              onChange={(e) => updateAttributes({ text: e.target.value })}
              rows={2}
              className="flex-1 bg-transparent text-sm text-orange-200 outline-none resize-none"
            />
          ) : (
            <p className="text-sm text-orange-200">
              <strong className="text-orange-400">NOTE: </strong>
              {text}
            </p>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function StepBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const text = (node.attrs.text as string) || "Describe this step...";
  const number = (node.attrs.number as string) || "1";
  return (
    <NodeViewWrapper>
      <div
        className={`my-2 flex gap-3 pl-2 ${
          selected ? "ring-1 ring-cyan-400/30 rounded-lg p-2" : ""
        }`}
      >
        {selected ? (
          <input
            value={number}
            onChange={(e) => updateAttributes({ number: e.target.value })}
            className="w-8 bg-[#0B1020] border border-white/10 rounded text-center text-sm text-cyan-400"
          />
        ) : (
          <span className="text-cyan-400 font-bold w-8 text-right shrink-0">{number}.</span>
        )}
        {selected ? (
          <textarea
            value={text}
            onChange={(e) => updateAttributes({ text: e.target.value })}
            rows={2}
            className="flex-1 bg-transparent text-sm text-slate-300 outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-slate-300">{text}</p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const TipCallout = Node.create({
  name: "tipCallout",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      text: {
        default: "Helpful tip goes here.",
        parseHTML: (el) => el.getAttribute("data-text"),
        renderHTML: (attrs) => ({ "data-text": attrs.text }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout="tip"]' }];
  },
  renderHTML({ node }) {
    return ["div", { "data-callout": "tip", "data-text": node.attrs.text }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TipCalloutView);
  },
  addCommands() {
    return {
      setTipCallout:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const WarningCallout = Node.create({
  name: "warningCallout",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      text: {
        default: "Important note or warning.",
        parseHTML: (el) => el.getAttribute("data-text"),
        renderHTML: (attrs) => ({ "data-text": attrs.text }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout="warning"]' }];
  },
  renderHTML({ node }) {
    return ["div", { "data-callout": "warning", "data-text": node.attrs.text }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(WarningCalloutView);
  },
  addCommands() {
    return {
      setWarningCallout:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const StepBlock = Node.create({
  name: "stepBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      number: {
        default: "1",
        parseHTML: (el) => el.getAttribute("data-number"),
        renderHTML: (attrs) => ({ "data-number": attrs.number }),
      },
      text: {
        default: "Describe this step.",
        parseHTML: (el) => el.getAttribute("data-text"),
        renderHTML: (attrs) => ({ "data-text": attrs.text }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout="step"]' }];
  },
  renderHTML({ node }) {
    return [
      "div",
      {
        "data-callout": "step",
        "data-number": node.attrs.number,
        "data-text": node.attrs.text,
      },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(StepBlockView);
  },
  addCommands() {
    return {
      setStepBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const SceneBreak = Node.create({
  name: "sceneBreak",
  group: "block",
  atom: true,
  parseHTML() {
    return [{ tag: 'hr[data-kbp="scene-break"]' }];
  },
  renderHTML() {
    return ["hr", mergeAttributes({ "data-kbp": "scene-break", class: "kbp-scene-break" })];
  },
  addCommands() {
    return {
      setSceneBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
