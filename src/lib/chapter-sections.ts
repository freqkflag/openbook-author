import type { ChapterSectionType } from "@/types/book";

export interface SectionTemplate {
  id: ChapterSectionType;
  name: string;
  description: string;
  category: "front-matter" | "structure" | "activity" | "layout" | "reference";
  defaultTitle: string;
  content: string;
}

export const SECTION_CATEGORIES = {
  "front-matter": "Front Matter",
  structure: "Structure",
  activity: "Activities",
  layout: "Layout & Media",
  reference: "Reference",
} as const;

const COPYRIGHT_YEAR = new Date().getFullYear();

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: "copyright",
    name: "Copyright",
    description: "Copyright notice, rights reservation, and publisher imprint.",
    category: "front-matter",
    defaultTitle: "Copyright",
    content: `<div class="section-copyright">
<p class="no-indent">Copyright © ${COPYRIGHT_YEAR} [Publisher Name]. All rights reserved.</p>
<p class="no-indent">No part of this publication may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the publisher, except for brief quotations in reviews or scholarly citations.</p>
<p class="no-indent">Published by [Publisher Name]</p>
</div>`,
  },
  {
    id: "dedication",
    name: "Dedication",
    description: "A dedication page — for someone who inspired this work.",
    category: "front-matter",
    defaultTitle: "Dedication",
    content: `<div class="section-dedication">
<p class="no-indent"><em>For [name or dedication text]</em></p>
</div>`,
  },
  {
    id: "chapter",
    name: "Chapter",
    description: "Standard chapter with headings and body text.",
    category: "structure",
    defaultTitle: "New Chapter",
    content: "<h1>New Chapter</h1><p>Start writing here...</p>",
  },
  {
    id: "indented",
    name: "Indented Section",
    description: "Inset block with indented paragraphs — ideal for asides or extended quotes.",
    category: "structure",
    defaultTitle: "Indented Section",
    content: `<h2>Indented Section</h2>
<div class="section-indented">
<p>This content sits in an indented block, set apart from the main narrative. Use it for extended quotations, historical context, or supplementary detail.</p>
<p>Additional paragraphs maintain the inset styling throughout the section.</p>
</div>`,
  },
  {
    id: "introduction",
    name: "Introduction",
    description: "Front-matter intro with welcome and overview.",
    category: "structure",
    defaultTitle: "Introduction",
    content: `<h1>Introduction</h1>
<p class="no-indent">Welcome. This section sets the stage for what follows — who this book is for, what you'll learn, and how to get the most from it.</p>
<h2>What You'll Discover</h2>
<ul>
<li>Key theme or topic one</li>
<li>Key theme or topic two</li>
<li>Key theme or topic three</li>
</ul>`,
  },
  {
    id: "appendix",
    name: "Appendix",
    description: "Supplementary reference material at the end of the book.",
    category: "structure",
    defaultTitle: "Appendix",
    content: `<h1>Appendix</h1>
<h2>Additional Resources</h2>
<p>Use this section for supplementary tables, data, extended notes, or reference material that supports the main text.</p>
<ul>
<li>Resource or reference item</li>
<li>Resource or reference item</li>
</ul>`,
  },
  {
    id: "journal",
    name: "Journal Page",
    description: "Dated journal entry with reflection prompts.",
    category: "activity",
    defaultTitle: "Journal Entry",
    content: `<div class="section-journal">
<p class="journal-date"><em>Date: _______________</em></p>
<h2>Today's Reflection</h2>
<p class="journal-prompt"><strong>Prompt:</strong> What stood out to you today? What are you grateful for?</p>
<p class="journal-lines">&nbsp;</p>
<p class="journal-lines">&nbsp;</p>
<p class="journal-lines">&nbsp;</p>
<h3>Notes</h3>
<p class="journal-lines">&nbsp;</p>
<p class="journal-lines">&nbsp;</p>
</div>`,
  },
  {
    id: "workbook",
    name: "Workbook Page",
    description: "Exercises, fill-ins, and practice activities.",
    category: "activity",
    defaultTitle: "Workbook Exercise",
    content: `<div class="section-workbook">
<h2>Workbook Exercise</h2>
<p class="workbook-instructions"><strong>Instructions:</strong> Complete each exercise below. Take your time and write freely.</p>
<h3>Exercise 1</h3>
<p><strong>Question:</strong> What is the main idea you want to explore?</p>
<p class="workbook-blank">Answer: _______________________________________________</p>
<p class="workbook-blank">___________________________________________________</p>
<h3>Exercise 2</h3>
<p><strong>Apply it:</strong> How will you use this in practice?</p>
<p class="workbook-blank">___________________________________________________</p>
</div>`,
  },
  {
    id: "checklist",
    name: "Checklist",
    description: "Task list or step-by-step checklist page.",
    category: "activity",
    defaultTitle: "Checklist",
    content: `<div class="section-checklist">
<h2>Checklist</h2>
<ul class="checklist-items">
<li>☐ First item to complete</li>
<li>☐ Second item to complete</li>
<li>☐ Third item to complete</li>
<li>☐ Fourth item to complete</li>
</ul>
<p><em>Check off each item as you complete it.</em></p>
</div>`,
  },
  {
    id: "reflection",
    name: "Reflection Questions",
    description: "Guided reflection with open-ended questions.",
    category: "activity",
    defaultTitle: "Reflection",
    content: `<div class="section-reflection">
<h2>Reflection Questions</h2>
<p>Take a moment to consider the following. There are no right or wrong answers.</p>
<ol>
<li>What was the most surprising thing you learned?</li>
<li>How does this connect to your own experience?</li>
<li>What would you do differently next time?</li>
<li>What questions do you still have?</li>
</ol>
<p class="reflection-space"><strong>Your thoughts:</strong></p>
<p class="workbook-blank">___________________________________________________</p>
<p class="workbook-blank">___________________________________________________</p>
</div>`,
  },
  {
    id: "quote",
    name: "Quote Page",
    description: "Epigraph or pull-quote spread.",
    category: "layout",
    defaultTitle: "Quote",
    content: `<div class="section-quote">
<blockquote>
<p>"Insert a meaningful quotation, epigraph, or pull-quote here. Let it breathe on the page."</p>
</blockquote>
<p class="quote-attribution">— Author Name, <em>Source Title</em></p>
</div>`,
  },
  {
    id: "photo-spread",
    name: "Photo Spread",
    description: "Image-focused page with captions.",
    category: "layout",
    defaultTitle: "Photo Spread",
    content: `<div class="section-photo-spread">
<h2>Photo Spread</h2>
<p><em>Add images using the toolbar image button. This layout is optimized for visual storytelling.</em></p>
<figure class="photo-placeholder">
<p>[ Image 1 — add your photo here ]</p>
<figcaption>Caption for the first image</figcaption>
</figure>
<figure class="photo-placeholder">
<p>[ Image 2 — add your photo here ]</p>
<figcaption>Caption for the second image</figcaption>
</figure>
</div>`,
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Chronological events or milestones.",
    category: "layout",
    defaultTitle: "Timeline",
    content: `<div class="section-timeline">
<h2>Timeline</h2>
<div class="timeline-entry">
<p class="timeline-date"><strong>Date / Era</strong></p>
<p>Description of what happened during this period.</p>
</div>
<div class="timeline-entry">
<p class="timeline-date"><strong>Date / Era</strong></p>
<p>Description of the next significant event.</p>
</div>
<div class="timeline-entry">
<p class="timeline-date"><strong>Date / Era</strong></p>
<p>Description of a third milestone or turning point.</p>
</div>
</div>`,
  },
  {
    id: "glossary",
    name: "Glossary Entry",
    description: "Term definitions and vocabulary.",
    category: "reference",
    defaultTitle: "Glossary",
    content: `<div class="section-glossary">
<h2>Glossary</h2>
<dl>
<dt><strong>Term One</strong></dt>
<dd>Definition of the first key term used in this book.</dd>
<dt><strong>Term Two</strong></dt>
<dd>Definition of the second key term.</dd>
<dt><strong>Term Three</strong></dt>
<dd>Definition of the third key term.</dd>
</dl>
</div>`,
  },
  {
    id: "interview",
    name: "Q&A / Interview",
    description: "Question-and-answer format page.",
    category: "reference",
    defaultTitle: "Interview",
    content: `<div class="section-interview">
<h2>Interview</h2>
<div class="qa-block">
<p class="qa-question"><strong>Q:</strong> What inspired you to write about this topic?</p>
<p class="qa-answer"><strong>A:</strong> Your answer goes here...</p>
</div>
<div class="qa-block">
<p class="qa-question"><strong>Q:</strong> What do you hope readers take away?</p>
<p class="qa-answer"><strong>A:</strong> Your answer goes here...</p>
</div>
<div class="qa-block">
<p class="qa-question"><strong>Q:</strong> What's next for you?</p>
<p class="qa-answer"><strong>A:</strong> Your answer goes here...</p>
</div>
</div>`,
  },
  {
    id: "takeaways",
    name: "Key Takeaways",
    description: "Summary bullets and action items.",
    category: "reference",
    defaultTitle: "Key Takeaways",
    content: `<div class="section-takeaways">
<h2>Key Takeaways</h2>
<p>Summarize the most important points from this section:</p>
<ul>
<li><strong>Takeaway 1:</strong> Main point or lesson learned</li>
<li><strong>Takeaway 2:</strong> Second key insight</li>
<li><strong>Takeaway 3:</strong> Third key insight</li>
</ul>
<h3>Action Items</h3>
<ul>
<li>☐ One thing to try this week</li>
<li>☐ One thing to share with someone</li>
</ul>
</div>`,
  },
];

export function getSectionTemplate(id: ChapterSectionType): SectionTemplate {
  return SECTION_TEMPLATES.find((t) => t.id === id) ?? SECTION_TEMPLATES[0];
}

export function getSectionsByCategory() {
  return (Object.keys(SECTION_CATEGORIES) as Array<keyof typeof SECTION_CATEGORIES>).map(
    (key) => ({
      key,
      label: SECTION_CATEGORIES[key],
      sections: SECTION_TEMPLATES.filter((s) => s.category === key),
    })
  );
}
