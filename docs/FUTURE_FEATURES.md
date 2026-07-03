# Future Features

Roadmap ideas for OpenBook Author, grouped by impact area. Track active work on [GitHub Issues](https://github.com/freqkflag/openbook-author/issues).

**Status key:** ✅ Shipped · 🟡 Partial · ⬜ Planned

| # | Item | Status |
|---|------|--------|
| 1 | Cover image & front matter | ✅ Cover upload, title page preview, copyright/dedication sections (v0.2+) |
| 2 | Drag-and-drop assets | ✅ Asset panel + picker (v0.2) |
| 3 | Full-book preview | ✅ Edit / Preview / Full toggle (v0.2) |
| 4 | EPUB import | ✅ Dashboard import with widget reverse-transform |
| 5 | File-based projects | ✅ `.openbook` packages + Electron save/open (v0.2); localStorage remains library cache |
| 6 | Tables, footnotes, and endnotes | ⬜ Planned v0.4 |
| 7 | Keyboard shortcuts | ✅ Cmd+S, Cmd+P, Cmd+Shift+P, Cmd+Shift+F, Cmd+/ cheat sheet (v0.2+) |
| 8 | Spell check & readability | ✅ Browser spellcheck + AI Clarity pass |
| 9 | Search across the book | ✅ Find/replace modal (Cmd+Shift+F) |
| 10 | Drag-and-drop chapter reorder | ✅ Grip handle drag with aria-grabbed |
| 11 | Custom section templates | ✅ Save from sidebar; My templates in picker |
| 12 | More section templates | ✅ Resources, Learning Objectives, Practice Quiz, Bibliography |
| 13 | More interactive widgets | ⬜ Next (iBooks Author parity) |
| 14 | Fixed-layout (landscape) editor | ⬜ Next (iBooks Author parity) |
| 15 | Better IBA import | ⬜ Next (iBooks Author parity) |
| 24 | Tests | 🟡 Vitest + EPUB snapshot tests; expand coverage |

---

## High impact

**1. Cover image & front matter** 🟡  
*Mostly shipped.* Cover upload via asset manager, title page in full preview and EPUB export, copyright and dedication section types. Further front-matter polish (dedication templates, store metadata fields) may follow.

**2. Drag-and-drop assets (not URL prompts)** ✅  
*Shipped in v0.2+.* Asset panel with drag-and-drop upload, per-book image library, Asset Picker in the editor, and in-app modals for links and popups (replacing `window.prompt`).

**3. Full-book preview** ✅  
*Shipped in v0.2.* Full-book mode scrolls through cover, title page, and all sections in one continuous print/e-reader view (Edit / Preview / Full toolbar).

**4. EPUB import** ✅  
*Shipped.* Import `.epub` from the dashboard; extracts chapters, images, metadata, and reverse-transforms popup/gallery/guidebook widgets back into editor-compatible HTML.

**5. File-based projects (especially in Electron)** ✅  
*Shipped in v0.2.* `.openbook` zip packages with Electron save/open and web download/upload. Books are still indexed in localStorage as a library cache — save to disk for durability.

---

## Authoring & editor polish

**6. Tables, footnotes, and endnotes** ⬜ *Planned v0.4*  
Standard for textbooks and guidebooks. TipTap has extensions for both.

**7. Keyboard shortcuts** ✅  
`Cmd+S` (save), `Cmd+P` (chapter preview), `Cmd+Shift+P` (full-book preview), `Cmd+Shift+F` (find/replace), `Cmd+/` and `?` shortcut cheat sheet, plus formatting shortcuts in the editor.

**8. Spell check & readability** ✅  
Browser-native spellcheck on the editor (with book language metadata), plus AI **Clarity pass** on a chapter.

**9. Search across the book** ✅  
Find/replace across all sections via `Cmd+Shift+F` — essential once books get long.

**10. Drag-and-drop chapter reorder** ✅  
Grip-handle drag in the sidebar (not the whole row), with basic `aria-grabbed` accessibility.

**11. Custom section templates** ✅  
Save any section as a reusable template from the sidebar; **My templates** appear in the Add Section picker.

**12. More section templates** ✅  
Resources, Learning Objectives, Practice Quiz, and Bibliography section types with preview styling.

---

## iBooks Author parity

**13. More interactive widgets** ⬜  
You have popups and galleries. The biggest gaps vs iBooks Author:
- Quiz / review questions
- Image hotspots
- Audio/video embeds (not just images)
- Keynote/Pages import

**14. Fixed-layout (landscape) editor** ⬜  
Landscape template exists, but the editor is still reflowable. A true fixed-layout canvas with positioned elements would unlock photo books and comics.

**15. Better IBA import** ⬜  
Current import gets text + images only. Next step: preserve nested chapter hierarchy, more `sl:tag` semantics, and a report of what couldn’t be imported.

---

## Publishing & distribution

**16. PDF export** ⬜  
Many authors want print-ready PDF alongside EPUB/KBP — especially for workbooks and journals.

**17. Apple Books / KDP validation** ⬜  
Pre-flight checks before export: missing alt text, broken image links, empty chapters, TOC issues. A “publish readiness” panel would save a lot of pain.

**18. Metadata for stores** ⬜  
ISBN field, BISAC categories, age rating, keywords — the fields KDP and Apple Books actually ask for.

---

## AI — go deeper

**19. Book-aware AI context** ⬜  
Right now AI sees one chapter. Passing the full outline + prior chapter summaries would make “continue writing” and “generate outline” much smarter.

**20. AI section generation** ⬜  
“Add a workbook page for Chapter 3” or “Generate 5 quiz questions from this section” tied directly to the section picker.

**21. Style guide / voice profile** ⬜  
Let authors define tone (“conversational travel guide”, “academic textbook”) and have AI follow it consistently.

---

## Platform & reliability

**22. Auto-save indicator + recovery** ⬜  
Show last-saved time; recover from a crash buffer if localStorage write fails mid-edit.

**23. PWA / offline mode** ⬜  
Service worker + cached app shell so the web version works on a plane.

**24. Tests** 🟡  
At minimum: EPUB export snapshot tests, IBA import fixtures, KBP transform unit tests. Without these, export regressions will creep in.

**25. Accessibility** ⬜  
WCAG contrast in preview, heading hierarchy warnings, required alt text on images before export.

---

## Related GitHub issues

| Topic | Issue |
|-------|-------|
| Hierarchical TOC structure mode | [#49](https://github.com/freqkflag/openbook-author/issues/49) |
| EPUB import | [#6](https://github.com/freqkflag/openbook-author/issues/6) |
| Front matter (copyright & dedication) | [#5](https://github.com/freqkflag/openbook-author/issues/5) |
| PDF export | [#7](https://github.com/freqkflag/openbook-author/issues/7) |
| Search/replace across book | [#9](https://github.com/freqkflag/openbook-author/issues/9) |
