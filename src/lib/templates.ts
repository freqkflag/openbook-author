import type { BookTemplate, LayoutMode } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import {
  buildGettingStartedChapterContent,
  buildTrailReferenceChapterContent,
} from "@/lib/guidebook-seed";

export interface TemplateInfo {
  id: BookTemplate;
  name: string;
  description: string;
  layoutMode: LayoutMode;
  formatProfile?: "standard" | "kbp";
  sampleChapters: { title: string; content: string }[];
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "portrait",
    name: "Portrait Book",
    description: "Reflowable text ideal for novels, essays, and long-form reading.",
    layoutMode: "portrait",
    sampleChapters: [
      {
        title: "Introduction",
        content:
          "<h1>Introduction</h1><p>Welcome to your new book. Portrait templates use reflowable text that adapts to any screen size — perfect for fiction, memoirs, and text-heavy content.</p>",
      },
      {
        title: "Chapter One",
        content:
          "<h1>Chapter One</h1><p>Begin your story here. The text will flow naturally across pages when exported to EPUB.</p>",
      },
    ],
  },
  {
    id: "landscape",
    name: "Landscape Book",
    description: "Fixed layout for photo books, comics, and design-heavy publications.",
    layoutMode: "landscape",
    sampleChapters: [
      {
        title: "Cover Spread",
        content:
          "<h1>Cover Spread</h1><p>Landscape templates preserve your exact layout — ideal for image galleries, comics, and illustrated books.</p>",
      },
      {
        title: "Page Two",
        content:
          "<h1>Page Two</h1><p>Add images, columns, and precise positioning. Your design stays pixel-perfect on export.</p>",
      },
    ],
  },
  {
    id: "textbook",
    name: "Textbook",
    description: "Structured chapters with headings, callouts, and learning objectives.",
    layoutMode: "portrait",
    sampleChapters: [
      {
        title: "Learning Objectives",
        content:
          "<h1>Learning Objectives</h1><ul><li>Understand the core concepts</li><li>Apply knowledge through exercises</li><li>Evaluate real-world examples</li></ul>",
      },
      {
        title: "Chapter 1: Foundations",
        content:
          "<h1>Chapter 1: Foundations</h1><h2>Key Concept</h2><p>Textbooks benefit from clear hierarchy — headings, lists, and callout boxes help readers navigate complex material.</p><blockquote><p><strong>Note:</strong> Use the AI assistant to generate quiz questions or expand sections.</p></blockquote>",
      },
    ],
  },
  {
    id: "guidebook",
    name: "Guidebook",
    description:
      "Travel guides, how-tos, and manuals with tips, warnings, steps, and KBP-ready formatting.",
    layoutMode: "portrait",
    formatProfile: "kbp",
    sampleChapters: [
      {
        title: "About This Guide",
        content: `<h1>About This Guide</h1>
<p class="no-indent">Welcome to your guidebook. This template is optimized for practical, reference-style books — travel guides, tutorials, field manuals, and how-to publications.</p>
<div data-callout="tip" data-text="Use the AI assistant to generate destination tips, step-by-step instructions, or expand sections."></div>
<h2>What You'll Find</h2>
<ul>
<li>Structured chapters with clear headings</li>
<li>Tip and warning callout boxes</li>
<li>Trail stop, workshop, and cheat sheet blocks</li>
<li>Numbered step blocks for procedures</li>
<li>KBP export ready for Kindle Direct Publishing</li>
</ul>`,
      },
      {
        title: "How to Use This Guide",
        content: `<h1>How to Use This Guide</h1>
<p class="no-indent">Each chapter covers a self-contained topic. Look for these elements as you read:</p>
<div data-callout="tip" data-text="Tips highlight helpful shortcuts, local knowledge, or best practices."></div>
<div data-callout="warning" data-text="Warnings flag safety concerns, prerequisites, or common mistakes."></div>
<div data-callout="step" data-number="1" data-text="Step blocks walk you through procedures in order. Add more from the toolbar."></div>
<hr data-kbp="scene-break" />
<h2>Quick Reference</h2>
<p>Use popup widgets for optional deep-dives, and image galleries for photo tours.</p>`,
      },
      {
        title: "Chapter 1: Getting Started",
        content: buildGettingStartedChapterContent(),
      },
      {
        title: "Trail Reference",
        content: buildTrailReferenceChapterContent(),
      },
    ],
  },
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch with a single empty chapter.",
    layoutMode: "portrait",
    sampleChapters: [
      {
        title: "Untitled Chapter",
        content: "<p></p>",
      },
    ],
  },
];

export function getTemplate(id: BookTemplate): TemplateInfo {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[4];
}

export function getDefaultKbpForTemplate(template: BookTemplate) {
  const tpl = getTemplate(template);
  if (tpl.formatProfile === "kbp") {
    return { ...DEFAULT_KBP_SETTINGS, enabled: true };
  }
  return { ...DEFAULT_KBP_SETTINGS };
}
