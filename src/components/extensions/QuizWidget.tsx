"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { HelpCircle } from "lucide-react";

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answerIndex: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    quizWidget: {
      setQuizWidget: (attrs: { title: string; questions: QuizQuestion[] }) => ReturnType;
    };
  }
}

function QuizWidgetView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const title = (node.attrs.title as string) || "Quick Quiz";
  const questions = (node.attrs.questions as QuizQuestion[]) || [
    { prompt: "Sample question?", choices: ["A", "B", "C"], answerIndex: 0 },
  ];

  return (
    <NodeViewWrapper>
      <div
        className={`my-4 rounded-xl border overflow-hidden ${
          selected ? "border-fuchsia-500/50" : "border-amber-500/30"
        }`}
        data-widget="quiz"
        data-title={title}
        data-payload={JSON.stringify(questions)}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-white/10">
          <HelpCircle size={16} className="text-amber-400" />
          <span className="text-sm text-amber-200 font-medium">{title}</span>
        </div>
        <ol className="px-4 py-3 space-y-2 text-sm text-slate-300 list-decimal list-inside">
          {questions.map((q, i) => (
            <li key={i}>{q.prompt}</li>
          ))}
        </ol>
        {selected && (
          <div className="px-4 py-2 border-t border-white/10 space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              className="w-full bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <textarea
              value={questions.map((q) => q.prompt).join("\n")}
              onChange={(e) =>
                updateAttributes({
                  questions: e.target.value
                    .split("\n")
                    .filter(Boolean)
                    .map((prompt, idx) => ({
                      prompt,
                      choices: questions[idx]?.choices ?? ["Yes", "No"],
                      answerIndex: questions[idx]?.answerIndex ?? 0,
                    })),
                })
              }
              rows={3}
              className="w-full bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-xs text-white resize-none"
              placeholder="One question per line"
            />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const QuizWidget = Node.create({
  name: "quizWidget",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: "Quick Quiz" },
      questions: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-widget="quiz"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-widget": "quiz",
        "data-title": HTMLAttributes.title,
        "data-payload": JSON.stringify(HTMLAttributes.questions ?? []),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuizWidgetView);
  },

  addCommands() {
    return {
      setQuizWidget:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
