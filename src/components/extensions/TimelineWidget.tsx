"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Clock } from "lucide-react";

/** Community example widget — ADR-0009 reference implementation */
export interface TimelineEvent {
  year: string;
  label: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    timelineWidget: {
      setTimelineWidget: (attrs: { title: string; events: TimelineEvent[] }) => ReturnType;
    };
  }
}

function TimelineWidgetView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const title = (node.attrs.title as string) || "Timeline";
  const events = (node.attrs.events as TimelineEvent[]) || [{ year: "2026", label: "Event" }];

  return (
    <NodeViewWrapper>
      <div
        className={`my-4 rounded-xl border border-violet-500/30 p-4 ${
          selected ? "shadow-[0_0_12px_rgba(138,92,255,0.25)]" : ""
        }`}
        data-widget="timeline"
        data-title={title}
        data-payload={JSON.stringify(events)}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-violet-400" />
          <span className="text-sm font-medium text-violet-200">{title}</span>
        </div>
        <ul className="space-y-2">
          {events.map((ev, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-cyan-400 font-mono shrink-0">{ev.year}</span>
              <span className="text-slate-300">{ev.label}</span>
            </li>
          ))}
        </ul>
        {selected && (
          <textarea
            value={events.map((e) => `${e.year}|${e.label}`).join("\n")}
            onChange={(e) =>
              updateAttributes({
                events: e.target.value
                  .split("\n")
                  .filter(Boolean)
                  .map((line) => {
                    const [year, ...rest] = line.split("|");
                    return { year: year?.trim() ?? "", label: rest.join("|").trim() };
                  }),
              })
            }
            rows={3}
            className="mt-3 w-full bg-[#0B1020] border border-white/10 rounded px-2 py-1 text-xs text-white resize-none"
            placeholder="2026|First event"
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const TimelineWidget = Node.create({
  name: "timelineWidget",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: "Timeline" },
      events: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-widget="timeline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-widget": "timeline",
        "data-title": HTMLAttributes.title,
        "data-payload": JSON.stringify(HTMLAttributes.events ?? []),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TimelineWidgetView);
  },

  addCommands() {
    return {
      setTimelineWidget:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
