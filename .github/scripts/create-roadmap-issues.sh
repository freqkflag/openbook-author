#!/usr/bin/env bash
# Creates OpenBook Author roadmap issues on GitHub (idempotent-ish: skips if title exists)
set -euo pipefail
REPO="freqkflag/openbook-author"

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  local milestone_num="$4"
  local close="${5:-false}"

  if gh issue list --repo "$REPO" --search "in:title \"$title\"" --json title --jq '.[].title' 2>/dev/null | grep -Fxq "$title"; then
    echo "SKIP (exists): $title"
    return
  fi

  local url num
  url=$(gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels")
  num=$(echo "$url" | grep -oE '[0-9]+$')
  gh api -X PATCH "repos/$REPO/issues/$num" -f milestone="$milestone_num" >/dev/null
  echo "CREATED: $url (milestone #$milestone_num)"
  if [[ "$close" == "true" ]]; then
    gh issue close "$num" --repo "$REPO" --comment "Shipped in v0.2 on branch \`v0.2\`."
    echo "CLOSED: #$num"
  fi
}

# ── v0.2 (shipped) ──────────────────────────────────────────────
create_issue \
  "Asset manager with drag-and-drop image library" \
  "## Summary
Per-book asset panel with drag-and-drop upload, thumbnails, alt text, insert-into-chapter, and cover assignment.

## Status
**Shipped in v0.2** — \`AssetPanel\`, \`AssetPicker\`, \`assets/\` folder in \`.openbook\` packages.

## Acceptance
- [x] Drag-and-drop upload zone
- [x] Asset grid with preview, alt text, delete
- [x] Replace \`window.prompt\` image URLs in editor and gallery widget
- [x] Assets persist in \`.openbook\` zip" \
  "priority: high,area: editor,status: done" \
  1 \
  true

create_issue \
  "Cover page editor and preview integration" \
  "## Summary
First-class cover workflow: pick cover from assets, live title/author overlay preview, cover in chapter/full preview and EPUB/KBP export.

## Status
**Shipped in v0.2** — \`CoverEditor\`, cover in \`PrintPreview\`, \`FullBookPreview\`, EPUB \`cover.xhtml\`.

## Follow-up
- [ ] Copyright and dedication as dedicated section types (see #TBD-front-matter)" \
  "priority: high,area: editor,status: done" \
  1 \
  true

create_issue \
  "Full-book preview mode" \
  "## Summary
Read-only scroll through cover + all sections as continuous print/e-reader view.

## Status
**Shipped in v0.2** — \`FullBookPreview\` + Edit / Preview / Full toolbar toggle." \
  "priority: high,area: editor,status: done" \
  1 \
  true

create_issue \
  "File-based .openbook project save (Electron + web fallback)" \
  "## Summary
Durable \`.openbook\` zip packages on disk instead of fragile localStorage-only storage.

## Status
**Shipped in v0.2** — \`package-io.ts\`, Electron IPC save/open dialogs, web download/upload, debounced auto-save.

## Package layout
\`\`\`
manifest.json
book.json
assets/
\`\`\`" \
  "priority: high,area: platform,status: done" \
  1 \
  true

# ── High impact (open) ──────────────────────────────────────────
create_issue \
  "Front matter: copyright & dedication section types" \
  "## Summary
Extend cover workflow with dedicated copyright and dedication section types — iBooks Author treated front matter as first-class.

## Scope
- Copyright page section type with editable boilerplate
- Dedication section type
- Title page preview in full-book preview
- Include in EPUB/KBP export order

## Priority
High impact — completes cover & front matter workflow started in v0.2.

## Milestone
Consider for v0.3 polish or early v0.3." \
  "priority: high,area: editor" \
  2

create_issue \
  "EPUB import" \
  "## Summary
Import existing EPUB files into editable OpenBook projects — the most common migration path from other authoring tools.

## Scope
- Parse EPUB 3 package (OPF, nav, XHTML chapters)
- Extract metadata, chapters, and images into \`assets/\`
- Map styles/widgets where possible; report unsupported elements

## Priority
**#4 high impact** — authors migrating from Vellum, Sigil, Calibre, etc.

## Milestone
**v0.3**" \
  "priority: high,area: export" \
  2

# ── v0.3 ────────────────────────────────────────────────────────
create_issue \
  "PDF export" \
  "## Summary
Print-ready PDF export alongside EPUB/KBP — especially for workbooks, journals, and print-on-demand.

## Scope
- Full-book PDF with cover, TOC, and chapter page breaks
- Reuse print-preview CSS
- Electron: native print-to-PDF; Web: browser print or server-side renderer

## Milestone
**v0.3**" \
  "priority: high,area: export" \
  2

create_issue \
  "Tables, footnotes, and endnotes" \
  "## Summary
TipTap extensions for tables, footnotes, and endnotes — standard for textbooks and guidebooks.

## Scope
- Table insert/edit toolbar
- Footnote and endnote markers with linked notes section
- EPUB/KBP export support

## Milestone
**v0.3**" \
  "priority: medium,area: editor" \
  2

create_issue \
  "Search and replace across all chapters" \
  "## Summary
Find/replace across the entire book — essential once manuscripts get long.

## Scope
- Global find bar with match count
- Replace one / replace all
- Scope: current chapter vs whole book

## Milestone
**v0.3**" \
  "priority: medium,area: editor" \
  2

create_issue \
  "Publish readiness validation panel" \
  "## Summary
Pre-flight checks before export: missing alt text, broken image links, empty chapters, TOC issues.

## Scope
- Validation checklist in Book Properties or export dialog
- Block or warn on critical issues
- KDP / Apple Books oriented checks

## Milestone
**v0.3** (or early v0.4)" \
  "priority: medium,area: export" \
  2

# ── Authoring polish ────────────────────────────────────────────
create_issue \
  "Keyboard shortcuts and cheat sheet" \
  "## Summary
Standard editor shortcuts plus OpenBook-specific actions.

## Scope
- \`Cmd+B/I/U\`, \`Cmd+S\` save, \`Cmd+P\` preview
- \`Cmd+/\` shortcut cheat sheet overlay
- Document shortcuts in README

## Milestone
Ongoing — target v0.3" \
  "priority: medium,area: editor" \
  2

create_issue \
  "Spell check and AI clarity pass" \
  "## Summary
Browser-native spellcheck on the editor, plus optional AI \"clarity pass\" on a chapter.

## Scope
- Enable \`spellcheck\` on TipTap contenteditable
- AI action: improve clarity/readability without changing voice

## Milestone
v0.3–v0.4" \
  "priority: medium,area: editor,area: ai" \
  2

create_issue \
  "Drag-and-drop chapter reorder in sidebar" \
  "## Summary
Replace up/down arrows with drag handles for natural chapter reordering.

## Milestone
v0.3–v0.4" \
  "priority: medium,area: editor" \
  2

create_issue \
  "Custom reusable section templates" \
  "## Summary
Let users save any section as a reusable template (e.g. \"my journal layout\").

## Milestone
v0.4" \
  "priority: medium,area: editor" \
  3

# ── v0.4 — iBooks parity ────────────────────────────────────────
create_issue \
  "Quiz and review question widget" \
  "## Summary
Interactive quiz/review widget — biggest iBooks Author gap after popups and galleries.

## Milestone
**v0.4**" \
  "priority: medium,area: widgets" \
  3

create_issue \
  "Image hotspot widget" \
  "## Summary
Clickable regions on images for interactive guides and textbooks.

## Milestone
**v0.4**" \
  "priority: medium,area: widgets" \
  3

create_issue \
  "Audio and video embeds" \
  "## Summary
Embed audio/video assets (not just images) with asset manager support and EPUB export.

## Milestone
**v0.4**" \
  "priority: medium,area: widgets,area: export" \
  3

create_issue \
  "Keynote and Pages import" \
  "## Summary
Import from Apple Keynote/Pages for authors migrating from the Apple ecosystem.

## Milestone
**v0.4+**" \
  "priority: medium,area: export" \
  3

create_issue \
  "Improved IBA import (hierarchy, semantics, import report)" \
  "## Summary
Next step beyond text+images: preserve nested chapter hierarchy, more \`sl:tag\` semantics, and a report of what couldn't be imported.

## Milestone
**v0.4**" \
  "priority: medium,area: export" \
  3

# ── v0.5 ────────────────────────────────────────────────────────
create_issue \
  "Fixed-layout landscape canvas editor" \
  "## Summary
True fixed-layout canvas with positioned elements for photo books, comics, and landscape templates.

## Milestone
**v0.5**" \
  "priority: medium,area: editor" \
  4

create_issue \
  "Store metadata (ISBN, BISAC, keywords, age rating)" \
  "## Summary
Metadata fields that KDP and Apple Books actually ask for at publish time.

## Fields
- ISBN, BISAC categories, keywords, age rating, series info

## Milestone
**v0.5**" \
  "priority: medium,area: export" \
  4

create_issue \
  "Real-time collaboration" \
  "## Summary
Multi-author editing — deferred until file-based projects and asset model are stable.

## Milestone
**v0.5**" \
  "priority: low,area: platform" \
  4

# ── AI depth ────────────────────────────────────────────────────
create_issue \
  "Book-aware AI context (outline + prior chapters)" \
  "## Summary
Pass full book outline and prior chapter summaries to AI for smarter continue-writing and outline generation.

## Milestone
v0.4–v0.5" \
  "priority: medium,area: ai" \
  3

create_issue \
  "AI section generation tied to section picker" \
  "## Summary
\"Add a workbook page for Chapter 3\" or \"Generate 5 quiz questions from this section\" directly from the Add Section picker.

## Milestone
v0.4" \
  "priority: medium,area: ai" \
  3

create_issue \
  "AI style guide / voice profile" \
  "## Summary
Let authors define tone (\"conversational travel guide\", \"academic textbook\") and have AI follow it consistently across the book.

## Milestone
v0.4–v0.5" \
  "priority: medium,area: ai" \
  4

# ── Platform & reliability ──────────────────────────────────────
create_issue \
  "Auto-save indicator and crash recovery" \
  "## Summary
Show last-saved time; recover from a crash buffer if localStorage write fails mid-edit.

## Note
v0.2 added Electron auto-save to disk; extend with visible timestamp and recovery buffer for web.

## Milestone
v0.3" \
  "priority: low,area: platform" \
  2

create_issue \
  "PWA / offline mode" \
  "## Summary
Service worker + cached app shell so the web version works offline (e.g. on a plane).

## Milestone
v0.4–v0.5" \
  "priority: low,area: platform" \
  4

create_issue \
  "Export and import test suite" \
  "## Summary
At minimum: EPUB export snapshot tests, IBA import fixtures, KBP transform unit tests.

## Milestone
v0.3 (start early to prevent export regressions)" \
  "priority: low,area: platform,area: export" \
  2

create_issue \
  "Accessibility: WCAG preview, heading hierarchy, required alt text" \
  "## Summary
WCAG contrast in preview, heading hierarchy warnings, required alt text on images before export.

## Milestone
v0.4" \
  "priority: low,area: platform,area: editor" \
  3

echo "Done."
