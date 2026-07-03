# Future Features

Roadmap ideas for OpenBook Author, grouped by impact area. Track active work on [GitHub Issues](https://github.com/freqkflag/openbook-author/issues). For competitor comparison, bleeding-edge fit, and prioritized waves, see [COMPETITIVE_AUDIT.md](COMPETITIVE_AUDIT.md). **Wave status:** [WAVE-A-STATUS-COMPLETE.md](WAVE-A-STATUS-COMPLETE.md) (✅ complete) · [WAVE-B-STATUS.md](WAVE-B-STATUS.md) (✅ complete) · [WAVE-C-STATUS.md](WAVE-C-STATUS.md) (✅ complete).

**Status key:** ✅ Shipped · 🟡 Partial · ⬜ Planned

| # | Item | Status |
|---|------|--------|
| 1 | Cover image & front matter | ✅ Cover upload, title page preview, copyright/dedication sections (v0.2+) |
| 2 | Drag-and-drop assets | ✅ Asset panel + picker (v0.2) |
| 3 | Full-book preview | ✅ Edit / Preview / Full toggle (v0.2) |
| 4 | EPUB import | ✅ Dashboard import with widget reverse-transform |
| 5 | File-based projects | ✅ `.openbook` packages + Electron save/open (v0.2); localStorage remains library cache |
| 6 | Tables, footnotes, and endnotes | ✅ TipTap tables + note refs; EPUB/KBP export (#8) |
| 7 | Keyboard shortcuts | ✅ Cmd+S, Cmd+P, Cmd+Shift+P, Cmd+Shift+F, Cmd+/ cheat sheet (v0.2+) |
| 8 | Spell check & readability | ✅ Browser spellcheck + AI Clarity pass |
| 9 | Search across the book | ✅ Find/replace modal (Cmd+Shift+F) |
| 10 | Drag-and-drop chapter reorder | ✅ Grip handle drag with aria-grabbed |
| 11 | Custom section templates | ✅ Save from sidebar; My templates in picker |
| 12 | More section templates | ✅ Resources, Learning Objectives, Practice Quiz, Bibliography |
| 13 | More interactive widgets | ✅ Media + quiz widgets (Wave C); hotspots remain |
| 14 | Fixed-layout (landscape) editor | ✅ Canvas MVP + spread EPUB export (Wave C) |
| 15 | Better IBA import | ✅ Hierarchy + diagnostics report (Wave B) |
| 16 | PDF export | ✅ Print presets (US Letter, 6×9, A5), margins, page numbers, TOC leaders; web print + Electron native save |
| 17 | Apple Books / KDP validation | 🟡 Publish readiness + structural EPUB validation (Wave A.2); Kindle Previewer CLI docs in panel ([#56](https://github.com/freqkflag/openbook-author/issues/56)) |
| 18 | Metadata for stores | ✅ ISBN, BISAC, keywords, age rating, series fields |
| 19 | Book-aware AI context | ✅ TOC + prior chapter excerpts in `/api/ai` (#18) |
| 20 | AI section generation | ✅ Generate section action in AI panel (#19) |
| 21 | Style guide / voice profile | ✅ Voice profile + style guide in AI settings (#20) |
| 22 | Auto-save indicator + recovery | ✅ Relative last-saved badge; sessionStorage crash buffer (#22) |
| 23 | PWA / offline mode | ✅ Service worker + offline indicator ([#27](https://github.com/freqkflag/openbook-author/issues/27)) |
| 24 | Tests | 🟡 Vitest (114 tests): EPUB/guidebook export snapshots, IBA import fixture, store hydrate test — full suite still open ([#28](https://github.com/freqkflag/openbook-author/issues/28)) |
| 25 | Accessibility | 🟡 Wave A: heading hierarchy warnings + missing alt blocks export; WCAG preview / axe CI remain ([#29](https://github.com/freqkflag/openbook-author/issues/29)) |
| 26 | Docker deployment | ✅ Multi-stage Dockerfile + docker-compose (#26) |

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

**6. Tables, footnotes, and endnotes** ✅  
TipTap table extension (insert 3×3 with header row, row/column controls). Footnote and endnote inline references with EPUB 3 `noteref` export and endnotes section. Publish readiness warns on empty notes and headerless tables ([#8](https://github.com/freqkflag/openbook-author/issues/8)).

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

**13. More interactive widgets** ✅ *(Wave C)*  
Popups and galleries from v0.2+. Wave C adds **media** (`<audio>`/`<video>`) and **quiz/review** TipTap widgets with EPUB export transforms. Remaining gaps: interactive image hotspots, Keynote/Pages import.

**14. Fixed-layout (landscape) editor** ✅ *(Wave C MVP)*  
`FixedLayoutCanvas` spread editor for photo books and comics; EPUB fixed-layout export with viewport metadata (ADR-0007). Reflowable templates remain the default authoring path.

**15. Better IBA import** ✅ *(Wave B)*  
Import preserves nested chapter hierarchy, maps more `sl:tag` semantics, and surfaces an import diagnostics report for unsupported layout/widgets ([#19](https://github.com/freqkflag/openbook-author/issues/19)).

---

## Publishing & distribution

**16. PDF export** ✅  
Print-ready HTML export from the editor. **Web:** browser print dialog (Save as PDF). **Electron:** native save dialog with `printToPDF` — no pop-up required. **Presets:** US Letter, 6×9 trim, and A5 with margin options, page numbers, and TOC dot leaders via `PrintPdfModal`. Workbook, journal, checklist, reflection, and practice-quiz sections include print CSS aligned with preview. Unit tests cover document structure, presets, cover/masthead, asset resolution, and section styles. Bleed/CMYK remain out of scope.

**17. Apple Books / KDP validation** 🟡  
Publish readiness panel checks empty chapters, broken assets, TOC issues, duplicate TOC titles, KBP H1 checks, and KBP store metadata warnings before export. Heading hierarchy and missing alt text are export-blocking errors. Wave A.2 adds post-export structural EPUB validation (`epub-validation.ts`) and documents optional EPUBCheck / Kindle Previewer CLI steps — [#56](https://github.com/freqkflag/openbook-author/issues/56).

**18. Metadata for stores** ✅  
ISBN, BISAC categories, keywords, age rating, and series fields in Book Properties — exported in EPUB OPF and KBP manifest.

---

## AI — go deeper

**19. Book-aware AI context** ✅  
Passes full outline and prior chapter excerpts to the AI assistant so continue, outline, and generate-section actions understand the whole book.

**20. AI section generation** ✅  
**Generate section** in the AI panel creates a new chapter/section from a prompt and adds it via the store.

**21. Style guide / voice profile** ✅  
Voice profile and style guide fields in AI Settings; injected into the `/api/ai` system prompt and persisted in localStorage.

---

## Platform & reliability

**22. Auto-save indicator + recovery** ✅  
Save badge shows relative last-saved time; `sessionStorage` crash buffer when `localStorage.setItem` fails.

**23. PWA / offline mode** ✅  
Service worker (`public/sw.js`) caches the app shell and static assets; offline indicator when `navigator.onLine` is false. Books in `localStorage` and `.openbook` packages work offline; AI requires a connection.

**24. Tests** 🟡  
Wave A shipped: guidebook block/chapter/CSS export snapshots (`epub-export.snapshots.test.ts`), guidebook seed integration tests, IBA import fixture test, store hydrate test (`book-store.hydrate.test.ts`), plus KBP, PDF, publish-readiness, and orchestrator coverage (114 tests total). Broader export/import matrix tracked in [#28](https://github.com/freqkflag/openbook-author/issues/28).

**25. Accessibility** 🟡  
Wave A shipped: heading hierarchy warnings (skip levels, multiple H1) and missing image alt text as export-blocking errors. WCAG preview mode and axe-core CI remain — [#29](https://github.com/freqkflag/openbook-author/issues/29).

**26. Docker deployment** ✅  
Production multi-stage `Dockerfile` and `docker-compose.yml` for the standalone Next.js app.

---

## Wave B — FOSS differentiation *(✅ complete · [c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32))*

| # | Item | Status |
|---|------|--------|
| B1 | Hierarchical TOC / parts ([#49](https://github.com/freqkflag/openbook-author/issues/49)) | ✅ Nested spine + nav |
| B2 | Deepen IBA import ([#19](https://github.com/freqkflag/openbook-author/issues/19)) | ✅ Hierarchy + diagnostics |
| B3 | Git-for-books workflow ([#59](https://github.com/freqkflag/openbook-author/issues/59)) | ✅ Folder mode + Git panel (Electron) |
| B4 | AI RAG + consistency agent ([#60](https://github.com/freqkflag/openbook-author/issues/60)) | ✅ Chapter-scoped embeddings + fact check |
| B5 | Expand Ollama ([#61](https://github.com/freqkflag/openbook-author/issues/61)) | ✅ Model presets, structured JSON, offline badge |
| B6 | EPUB 3.3 metadata ([#62](https://github.com/freqkflag/openbook-author/issues/62)) | ✅ Package version + schema.org a11y |
| B7 | Self-hosted backup ([#63](https://github.com/freqkflag/openbook-author/issues/63)) | ✅ WebDAV + S3-compatible panel |

Detail: [WAVE-B-STATUS.md](WAVE-B-STATUS.md)

---

## Wave C — Experimental pilots *(✅ complete · [c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32))*

| # | Item | Status |
|---|------|--------|
| C1 | Fixed-layout canvas MVP ([#20](https://github.com/freqkflag/openbook-author/issues/20)) | ✅ `FixedLayoutCanvas` + spread export |
| C2 | Media + quiz widgets ([#17](https://github.com/freqkflag/openbook-author/issues/17), [#15](https://github.com/freqkflag/openbook-author/issues/15)) | ✅ EPUB transforms |
| C3 | WASM Typst PDF pilot ([#64](https://github.com/freqkflag/openbook-author/issues/64)) | ✅ Electron CLI compile hook |
| C4 | Yjs collab prototype ([#22](https://github.com/freqkflag/openbook-author/issues/22)) | ✅ BroadcastChannel MVP |
| C5 | Plugin SDK preview ([#65](https://github.com/freqkflag/openbook-author/issues/65)) | ✅ [plugin-sdk.md](plugin-sdk.md) + TimelineWidget |
| C6 | Audiobook manifest export ([#66](https://github.com/freqkflag/openbook-author/issues/66)) | ✅ W3C Audiobook LPF |
| C7 | Markdown authoring mode ([#67](https://github.com/freqkflag/openbook-author/issues/67)) | ✅ TipTap MD round-trip toggle |

Detail: [WAVE-C-STATUS.md](WAVE-C-STATUS.md)

---

## Related GitHub issues

See [WAVE-A-STATUS-COMPLETE.md](WAVE-A-STATUS-COMPLETE.md), [WAVE-B-STATUS.md](WAVE-B-STATUS.md), and [WAVE-C-STATUS.md](WAVE-C-STATUS.md) for issue closure guidance.

| Topic | Issue | Status |
|-------|-------|--------|
| Hierarchical TOC structure mode | [#49](https://github.com/freqkflag/openbook-author/issues/49) | ✅ Shipped Wave B — close |
| IBA import depth | [#19](https://github.com/freqkflag/openbook-author/issues/19) | ✅ Shipped Wave B — close |
| Git-for-books folder mode | [#59](https://github.com/freqkflag/openbook-author/issues/59) | ✅ Shipped Wave B — close |
| AI RAG consistency pass | [#60](https://github.com/freqkflag/openbook-author/issues/60) | ✅ Shipped Wave B — close |
| Ollama presets / offline badge | [#61](https://github.com/freqkflag/openbook-author/issues/61) | ✅ Shipped Wave B — close |
| EPUB 3.3 metadata | [#62](https://github.com/freqkflag/openbook-author/issues/62) | ✅ Shipped Wave B — close |
| Self-hosted backup | [#63](https://github.com/freqkflag/openbook-author/issues/63) | ✅ Shipped Wave B — close |
| Fixed-layout canvas | [#20](https://github.com/freqkflag/openbook-author/issues/20) | ✅ Shipped Wave C — close |
| Media widgets | [#17](https://github.com/freqkflag/openbook-author/issues/17) | ✅ Shipped Wave C — close |
| Quiz widget | [#15](https://github.com/freqkflag/openbook-author/issues/15) | ✅ Shipped Wave C — close |
| Typst PDF pilot | [#64](https://github.com/freqkflag/openbook-author/issues/64) | ✅ Shipped Wave C — close |
| Yjs collab prototype | [#22](https://github.com/freqkflag/openbook-author/issues/22) | ✅ Shipped Wave C — close |
| Plugin SDK preview | [#65](https://github.com/freqkflag/openbook-author/issues/65) | ✅ Shipped Wave C — close |
| Audiobook manifest | [#66](https://github.com/freqkflag/openbook-author/issues/66) | ✅ Shipped Wave C — close |
| Markdown mode | [#67](https://github.com/freqkflag/openbook-author/issues/67) | ✅ Shipped Wave C — close |
| EPUB import | [#6](https://github.com/freqkflag/openbook-author/issues/6) | ✅ Shipped — close |
| Front matter (copyright & dedication) | [#5](https://github.com/freqkflag/openbook-author/issues/5) | ✅ Shipped — close |
| PDF export | [#7](https://github.com/freqkflag/openbook-author/issues/7) | ✅ Shipped — closed |
| Search/replace across book | [#9](https://github.com/freqkflag/openbook-author/issues/9) | ✅ Shipped — close |
| Book-aware AI context | [#23](https://github.com/freqkflag/openbook-author/issues/23) | ✅ Shipped — close |
| AI section generation | [#24](https://github.com/freqkflag/openbook-author/issues/24) | ✅ Shipped — close |
| AI style guide / voice profile | [#25](https://github.com/freqkflag/openbook-author/issues/25) | ✅ Shipped — close |
| Auto-save + crash recovery | [#26](https://github.com/freqkflag/openbook-author/issues/26) | ✅ Shipped — closed |
| Export/import test suite | [#28](https://github.com/freqkflag/openbook-author/issues/28) | 🟡 Partial — keep open |
| Accessibility (WCAG preview) | [#29](https://github.com/freqkflag/openbook-author/issues/29) | 🟡 Partial — keep open |
| Agent orchestration / merge lanes | [#37](https://github.com/freqkflag/openbook-author/issues/37) | ✅ Shipped — close |
| PWA / offline mode | [#27](https://github.com/freqkflag/openbook-author/issues/27) | ✅ Shipped — close |
| Tables, footnotes, endnotes | [#8](https://github.com/freqkflag/openbook-author/issues/8) | ✅ Shipped Wave A.1 — close |
| Export theme system | [#55](https://github.com/freqkflag/openbook-author/issues/55) | ✅ Shipped Wave A.2 — close |
| DOCX import | [#54](https://github.com/freqkflag/openbook-author/issues/54) | ✅ Shipped Wave A.2 — close |
| EPUBCheck / Kindle Previewer | [#56](https://github.com/freqkflag/openbook-author/issues/56) | ✅ Shipped Wave A.2 — close |
