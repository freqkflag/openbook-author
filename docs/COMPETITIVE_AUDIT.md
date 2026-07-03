# OpenBook Author — Competitive & Bleeding-Edge Tech Audit

**Branch:** `main` · **Version:** 0.2.0 + unreleased wave  
**Audit date:** July 2026  
**Scope:** Inventory from `README.md`, `CHANGELOG.md`, `docs/FUTURE_FEATURES.md`, and `src/` scan  
**Related:** [FUTURE_FEATURES.md](FUTURE_FEATURES.md) · [WAVE-A-STATUS.md](WAVE-A-STATUS.md) · [WAVE-B-STATUS.md](WAVE-B-STATUS.md) · [ADR index](adr/README.md)

---

## Executive Summary

- **OpenBook Author is a credible FOSS reflowable book studio** — TipTap editing, 19 section types, EPUB 3 + KBP export, publish readiness, `.openbook` packages, Electron macOS app, and a multi-provider AI panel with book-aware context already ship. It competes with Atticus/Vellum on *formatting intent*, not polish.
- **Biggest daily-author gaps** are professional print output (bleed/trim themes), import breadth (DOCX), PWA offline, and store validation (Kindle Previewer / EPUBCheck hooks) — footnotes/tables shipped in Wave A.1 ([#8](https://github.com/freqkflag/openbook-author/issues/8)).
- **iBooks Author parity is much closer:** popups, galleries, media/quiz widgets, and fixed-layout canvas MVP ship (Wave C); IBA import depth and hierarchical TOC ship (Wave B). Remaining gaps: interactive image hotspots, Keynote/Pages import, and production-grade multi-user collab.
- **Differentiation moat is FOSS + local-first + AI:** Ollama support, open `.openbook` format, IBA import, guidebook/KBP blocks, and Docker self-host are rare in paid competitors. Lean into these rather than chasing Atticus cloud sync.
- **Bleeding-edge pilots need ADRs first:** realtime collab (Yjs), plugin marketplace, cloud sync, and git-for-books all change storage, security, and export contracts — ADR-0002 covers TipTap widgets, not a marketplace.

---

## 1. What OpenBook Author Does Today (v0.2+)

### Core authoring

| Area | Shipped |
|------|---------|
| **Editor** | TipTap rich text — headings, lists, quotes, links, images, alignment, highlights |
| **Templates** | Portrait, Landscape, Textbook, Guidebook, Blank |
| **Sections** | 19 types: chapter, copyright, dedication, intro, appendix, journal, workbook, checklist, reflection, quote, photo-spread, timeline, glossary, interview, takeaways, resources, learning-objectives, practice-quiz, bibliography |
| **Chapters** | Add/rename/reorder/delete; grip-handle drag; custom section templates (localStorage) |
| **Assets** | Upload, preview, insert; cover from assets; `assets/{filename}` in HTML (no base64 bloat) |
| **Preview** | Chapter preview, full-book scroll (cover + all sections), print preview CSS |

### Publishing & export

| Area | Shipped |
|------|---------|
| **EPUB 3** | JSZip pipeline (`src/lib/epub.ts`); reflowable default; landscape sets `rendition:layout=pre-paginated` |
| **KBP** | `.kbp` zip for KDP — EPUB + HTML chapters + stylesheet |
| **PDF** | Web print dialog; Electron native `printToPDF`; section print CSS |
| **Readiness** | Pre-export gate — **errors** block export (heading hierarchy, missing alt); **warnings** advise only (TOC dupes, KBP H1, store metadata, empty notes, headerless tables) |
| **Tables & notes** | TipTap tables; footnote/endnote refs with EPUB 3 noteref export and endnotes section |
| **Metadata** | ISBN, BISAC, keywords, age rating, series → EPUB OPF + KBP manifest |
| **Front matter** | Copyright, dedication, title page in export |

### Import & interchange

| Area | Shipped |
|------|---------|
| **`.openbook`** | Zip: `manifest.json`, `book.json`, `assets/` |
| **EPUB import** | Dashboard; widget reverse-transform (popups, galleries, guidebook blocks) |
| **IBA import** | `.iba`, `.book`, templates — metadata, chapters, text, images (layout/widgets lost) |
| **DOCX import** | Dashboard **Import DOCX** — mammoth HTML, heading-based chapters, inline images to `assets/`, import report |
| **Legacy** | `.openbook.json` import |

### Interactive & KBP

| Area | Shipped |
|------|---------|
| **Widgets** | Popup (`<details>`), image gallery (ADR-0002) |
| **Guidebook** | Trail stop, workshop, cheat sheet blocks; tip/warning/step callouts |
| **KBP profile** | First-line indent, drop caps, scene breaks, chapter numbering |

### AI

| Area | Shipped |
|------|---------|
| **Actions** | Continue, Clarity pass, Expand, Rewrite, Summarize, Outline, Generate section, Custom |
| **Context** | TOC + prior-chapter excerpts (`src/lib/ai-context.ts`) |
| **Voice** | Voice profile + style guide in system prompt |
| **Providers** | OpenAI, Anthropic, Ollama (local) — keys in browser localStorage |

### Platform

| Area | Shipped |
|------|---------|
| **Web** | Next.js 16, React 19, Tailwind 4 |
| **Electron** | macOS `.dmg`; Save/Open/Save As; auto-save with path |
| **Docker** | Multi-stage Dockerfile + compose |
| **CI** | Lint, Vitest, build — axe-core export HTML fixtures in Vitest (Wave A.1) |
| **A11y (partial)** | Heading hierarchy warnings; alt-text export block; `aria-grabbed` on reorder |
| **Search** | Book-wide find/replace (`Cmd+Shift+F`) |
| **Spellcheck** | Browser native + book language |

### Explicitly not shipped

Do not re-list these as gaps without noting Wave status:

| Still out of scope | Notes |
|--------------------|-------|
| Print bleed / CMYK | Print presets ship; pro print color/bleed does not |
| DOCX **export** | DOCX **import** ✅ Wave A.2 ([#54](https://github.com/freqkflag/openbook-author/issues/54)) |
| MOBI export | KDP accepts EPUB; MOBI fixed-layout deprecated |
| Interactive image hotspots | IBA parity gap |
| Signed plugin **marketplace** | Plugin SDK **preview** ✅ Wave C ([c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32)) |
| Production collab backend | Yjs **prototype** ✅ Wave C; no hosted multi-user server |
| Full EPUBCheck CLI | Structural validation in readiness panel ✅ Wave A.2; Java CLI remains optional local step |

**Shipped Wave B** ([c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32)): hierarchical TOC/parts ([#49](https://github.com/freqkflag/openbook-author/issues/49)), IBA import depth ([#19](https://github.com/freqkflag/openbook-author/issues/19)), git-for-books folder mode + Git panel ([#59](https://github.com/freqkflag/openbook-author/issues/59)), AI RAG consistency pass ([#60](https://github.com/freqkflag/openbook-author/issues/60)), Ollama presets + offline badge ([#61](https://github.com/freqkflag/openbook-author/issues/61)), EPUB 3.3 + a11y metadata ([#62](https://github.com/freqkflag/openbook-author/issues/62)), self-hosted backup WebDAV/S3 ([#63](https://github.com/freqkflag/openbook-author/issues/63)).

**Shipped Wave C** ([c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32)): fixed-layout canvas MVP ([#20](https://github.com/freqkflag/openbook-author/issues/20)), media + quiz widgets ([#17](https://github.com/freqkflag/openbook-author/issues/17), [#15](https://github.com/freqkflag/openbook-author/issues/15)), Typst PDF pilot (Electron), Yjs collab prototype ([#22](https://github.com/freqkflag/openbook-author/issues/22)), plugin SDK preview ([#65](https://github.com/freqkflag/openbook-author/issues/65)), audiobook manifest export ([#66](https://github.com/freqkflag/openbook-author/issues/66)), markdown authoring mode ([#67](https://github.com/freqkflag/openbook-author/issues/67)).

---

## 2. Competitor Landscape (2025–2026)

### iBooks Author (legacy reference)

**Strengths:** Fixed + reflowable layouts, positioned objects, rich widget set (gallery, media, review/quiz, Keynote, interactive image, 3D, popover, scrolling sidebar), portrait/landscape dual view.

**OpenBook position:** Wins on active dev, FOSS, AI, IBA import, cross-platform web. Loses on layout fidelity, widget breadth, media, and Apple Books–specific interactivity.

### Vellum (~$200–250, Mac only)

**Strengths:** Best-in-class reflowable + print interiors, 26 polished themes, drop caps, scene breaks, series/volumes, rock-solid offline Mac workflow.

**Weaknesses:** No writing editor; import from Word/Scrivener; Mac-only.

**OpenBook position:** Comparable EPUB/KBP *intent* but far behind on typography themes and print PDF quality. Wins: free, web, AI, widgets, guidebook blocks.

### Atticus (~$147, cross-platform)

**Strengths:** Write + format in one app; 17+ themes, 1500+ fonts, callouts, footnotes, full-bleed, cloud sync, goals, beta-reader sharing, EPUB + print PDF.

**Weaknesses:** Cloud-dependent; reliability complaints; not FOSS.

**OpenBook position:** Matches chapter workflow, callouts, and footnotes; lacks theme library, cloud sync, writing goals. Wins: local-first, Ollama, open format, IBA import.

### Scrivener (~$60, Mac/Win/iOS)

**Strengths:** Binder, corkboard, snapshots, compile to EPUB 3/MOBI/MMD, research scrivening, industry-standard drafting.

**Weaknesses:** Steep compile learning curve; weak collaboration; export often needs Vellum/Atticus cleanup.

**OpenBook position:** Not a drafting/research tool. Wins: simpler publish path, AI, widgets. Loses: manuscript organization depth.

### Ulysses (~$40/yr, Apple)

**Strengths:** Distraction-free Markdown-ish writing, iCloud sync, clean EPUB/PDF/DOCX export, CSS style exchange.

**OpenBook position:** Wins on book-specific features (KBP, widgets, readiness). Loses: writing UX polish, Markdown workflow, multi-device sync.

### Pressbooks ($40–99/mo)

**Strengths:** Collaborative textbook platform, H5P interactives, LMS (Common Cartridge), accessible EPUB/PDF, custom CSS, institutional hosting.

**OpenBook position:** Wins: offline, one-time FOSS, no subscription. Loses: collaboration, H5P, LMS, hosted distribution.

### Notion / Google Docs

**Strengths:** Real-time collab, comments, track changes, ubiquitous access.

**OpenBook position:** Not comparable for EPUB export; authors use these *before* OpenBook. Opportunity: DOCX/Markdown import, not collab parity (yet).

### Canva

**Strengths:** Visual page design, templates, team collab, PDF/PNG export.

**OpenBook position:** Different category (pixel design vs semantic book). Fixed-layout photo books need canvas tooling OpenBook lacks.

### Kindle Create / KDP

**Strengths:** KPF for Amazon, reflowable + fixed-layout from PDF, genre themes, pop-ups for fixed layout, EPUB 3 export (reflowable only).

**OpenBook position:** KBP export is a FOSS alternative to KC reflowable path. Loses: KPF, fixed-layout pop-ups, Amazon-native preview loop. KDP accepts EPUB directly (MOBI fixed-layout deprecated March 2025).

---

## 3. Bleeding-Edge Tech — Fit Assessment

| Technology | Fit for Next.js/Electron/TipTap | Recommendation |
|------------|--------------------------------|----------------|
| **Multi-step AI agents + RAG** | High — manuscript is structured JSON + HTML; local embeddings in Electron | Pilot: chapter-scoped RAG + “consistency check” agent; keep keys local |
| **Local LLMs (Ollama)** | **Partially shipped** — extend with model picker, offline indicator, structured outputs | Wave B — low risk |
| **CRDT / Yjs collab** | Medium — TipTap has Yjs collab extension; needs backend or WebRTC | **ADR required** — Wave C |
| **WASM (Typst/Pandoc)** | High for print PDF quality — replace browser print for pro output | Wave C pilot in Electron only |
| **EPUB 3.3 / fixed-layout EPUB 3** | EPUB 3.0 today; 3.3 is backward-compatible upgrade; fixed-layout needs canvas + viewport | Fixed-layout = Wave A/B (parity); 3.3 metadata = Wave B (S) |
| **Audiobook (W3C / M4B)** | Medium — TTS pipeline or chapter audio assets + LPF manifest | Wave C — niche unless targeting accessibility |
| **Readium LCP** | Low priority for authoring tool; relevant if distributing DRM | Defer unless library partnerships |
| **PWA / offline** | High — aligns with local-first; service worker + cache `.openbook` | Wave A — authors on planes |
| **axe-core in CI** | High — low effort, matches partial a11y work | Wave A — S |
| **Plugin marketplace** | Medium — ADR-0002 pattern exists; marketplace needs sandbox + signing | **ADR required** — Wave C |
| **Cloud sync / self-hosted** | Medium — Docker exists; sync needs auth + conflict model | **ADR required** — Wave C |
| **POD APIs (Lulu, KDP)** | Medium — metadata + PDF presets first | Wave B after print hardening |
| **Git-for-books** | High FOSS moat — `.openbook` is already git-friendly text+json | Wave B — `.openbook` + diff UI |
| **Markdown/native authoring** | Medium — TipTap can import MD; dual-mode UX cost | Wave B optional |

---

## 4. Gap Analysis Matrix

| Feature area | Competitor has | We have | Priority | Effort | Strategic fit |
|--------------|----------------|---------|----------|--------|---------------|
| Rich text editing | All | ✅ TipTap | — | — | Core |
| Chapter/section management | All | ✅ + 19 section types | — | — | Core |
| EPUB export | All | ✅ EPUB 3 reflowable | — | — | Core |
| Print/PDF export | Vellum, Atticus, KC | 🟡 Print dialog; no bleed/trim | **P0** | M | High |
| Theme/font library | Vellum 26, Atticus 1500+ | ❌ Single CSS stack | **P0** | M | High |
| Footnotes/endnotes | Atticus, Scrivener, textbooks | ✅ Shipped (Wave A.1) | — | — | Core |
| Tables | Pressbooks, textbooks | ✅ Shipped (Wave A.1) | — | — | Core |
| DOCX import/export | Atticus, Ulysses, KC | Import ✅ / export ❌ | **P1** | L | High |
| Store validation (KDP/Apple) | KC, Vellum ecosystem | 🟡 Readiness panel only | **P1** | M | High |
| Fixed-layout editor | IBA, Canva, KC | ✅ Canvas MVP (Wave C); reflowable default | — | — | Medium (photo/comic niche) |
| Media widgets (audio/video) | IBA, Pressbooks | ✅ `MediaWidget` + EPUB export (Wave C) | — | — | Medium |
| Quiz/review widgets | IBA, Pressbooks H5P | ✅ `QuizWidget` + practice-quiz section (Wave C) | — | — | Medium |
| Interactive image hotspots | IBA | ❌ | **P2** | L | Medium |
| More IBA import fidelity | — | ✅ Hierarchy + diagnostics (Wave B) | — | — | **High (FOSS moat)** |
| Real-time collaboration | Notion, GDocs, Pressbooks | 🟡 Yjs prototype (Wave C); no hosted backend | **P2** | XL | Medium — **ADR** |
| Cloud sync | Atticus, Ulysses | 🟡 Opt-in WebDAV/S3 backup (Wave B) | **P2** | L | Medium — **ADR** |
| Writing goals / stats | Atticus, Ulysses | ❌ | **P2** | S | Medium |
| Binder/corkboard | Scrivener | ❌ | **P2** | L | Low |
| Hierarchical TOC | Scrivener, textbooks | ✅ Parts + nested EPUB/KBP nav ([#49](https://github.com/freqkflag/openbook-author/issues/49)) | — | — | High |
| AI writing assist | Few | ✅ Multi-action + context | — | — | **Differentiator** |
| Local LLM (Ollama) | None mainstream | ✅ | — | — | **Differentiator** |
| IBA import | None | ✅ Partial | — | — | **Differentiator** |
| KBP / guidebook blocks | None | ✅ | — | — | **Differentiator** |
| Publish readiness gate | Partial (validators) | ✅ | — | — | **Differentiator** |
| Open project format | Proprietary everywhere | ✅ `.openbook` | — | — | **Differentiator** |
| PWA / offline | Atticus (partial) | ✅ Service worker + offline indicator (Wave A.2) | — | — | High |
| Accessibility CI (axe) | Pressbooks (manual+) | 🟡 Export checks only | **P1** | S | High |
| EPUB 3.3 compliance | Industry moving | ✅ Metadata + a11y props (Wave B) | — | — | Medium |
| Audiobook export | Emerging | ✅ W3C LPF manifest (Wave C) | — | — | Low |
| WASM typst/pandoc PDF | Cambric, etc. | ✅ Typst pilot — Electron CLI (Wave C) | — | — | Medium |
| AI agents / RAG | Emerging | ✅ Chapter RAG + consistency pass (Wave B) | — | — | **High (FOSS moat)** |
| Plugin marketplace | None in category | 🟡 SDK preview + sample widget (Wave C) | **P3** | XL | Medium — **ADR** |
| Git-for-books | None | ✅ Folder mode + Git panel (Wave B) | — | — | **High (FOSS moat)** |
| POD API integration | Lulu, KDP dashboards | ❌ | **P3** | L | Low |
| MOBI export | Legacy | ❌ | **P3** | S | Low (KDP deprecated MOBI FL) |

---

## 5. Recommended Roadmap Waves (3–6 months)

### Wave A — Close daily author gaps (months 1–2)

**Goal:** Authors can finish and ship a reflowable nonfiction/fiction book without leaving OpenBook.

**Status (July 2026):** **Wave A.1** shipped on `main` (product-lane AI/platform work, footnotes/tables, axe-core export fixtures, partial PDF + EPUB validation). **Wave A.2 completion sprint** is in progress in parallel — themes ([#55](https://github.com/freqkflag/openbook-author/issues/55)), DOCX ([#54](https://github.com/freqkflag/openbook-author/issues/54)), PWA ([#27](https://github.com/freqkflag/openbook-author/issues/27)), PDF presets, and EPUBCheck ([#56](https://github.com/freqkflag/openbook-author/issues/56)). Track phase detail in [WAVE-A-STATUS.md](WAVE-A-STATUS.md).

1. **Footnotes/endnotes + tables** ✅ Wave A.1 — TipTap extensions, EPUB/KBP transforms ([#8](https://github.com/freqkflag/openbook-author/issues/8) · close)
2. **Export theme system** 🟡 Wave A.2 — 3–5 built-in themes + custom CSS hook — [#55](https://github.com/freqkflag/openbook-author/issues/55)
3. **DOCX import** ✅ — mammoth browser conversion — [#54](https://github.com/freqkflag/openbook-author/issues/54)
4. **Print PDF hardening** 🟡 Wave A.2 — trim sizes, page breaks, TOC leaders; Electron `printToPDF` presets
5. **PWA offline shell** 🟡 Wave A.2 — service worker, cache editor — [#27](https://github.com/freqkflag/openbook-author/issues/27)
6. **axe-core in CI** ✅ Wave A.1 — export HTML fixtures in Vitest/CI
7. **Kindle Previewer / EPUBCheck integration** 🟡 Wave A.2 — post-export validation in readiness panel — [#56](https://github.com/freqkflag/openbook-author/issues/56)

### Wave B — FOSS differentiation moat (months 2–4)

**Goal:** Features paid tools can't or won't ship.

**Status (July 2026):** ✅ **Complete** — all 7/7 items shipped on `main` ([c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32)). Track detail in [WAVE-B-STATUS.md](WAVE-B-STATUS.md).

1. **Deepen IBA import** — hierarchy report, more `sl:tag` semantics, import diagnostics UI — [#19](https://github.com/freqkflag/openbook-author/issues/19)
2. **Hierarchical TOC / parts** ([#49](https://github.com/freqkflag/openbook-author/issues/49)) — nested spine + nav
3. **Git-for-books workflow** — “Open folder” project mode, diff-friendly saves, optional Git panel in Electron
4. **AI RAG + consistency agent** — embed chapters locally (Electron); “character/timeline/fact check” pass
5. **Expand Ollama** — structured JSON actions, model presets, offline badge
6. **EPUB 3.3 metadata upgrade** + accessibility metadata (`schema.org` a11y)
7. **Self-hosted sync (optional)** — minimal WebDAV or S3-compatible backup of `.openbook` (ADR first)

### Wave C — Experimental pilots (months 4–6)

**Goal:** Validate before big architecture bets.

**Status (July 2026):** ✅ **Complete** — all 7/7 MVP pilots shipped on `main` ([c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32)). Track detail in [WAVE-C-STATUS.md](WAVE-C-STATUS.md).

1. **Fixed-layout canvas MVP** — single-page spread editor for photo books (ADR)
2. **Media + quiz widgets** — `<audio>`, `<video>`, interactive review (extend ADR-0002)
3. **WASM Typst/Pandoc PDF** — Electron-only pro print path
4. **Yjs collab prototype** — 2-user beta, self-hosted y-websocket (ADR)
5. **Plugin SDK preview** — document ADR-0002 → formal plugin API; 1–2 community widgets
6. **Audiobook manifest export** — W3C Audiobook LPF from chapter TTS or uploaded audio
7. **Markdown authoring mode** — TipTap MD round-trip for Ulysses refugees

---

## 6. Top 10 Recommendations (ordered)

1. **Theme system (3–5 export themes + CSS override)** — biggest perceived quality gap vs Vellum/Atticus. → [#55](https://github.com/freqkflag/openbook-author/issues/55) *(Wave A.2 sprint)*
2. **DOCX import** — lowers switching cost from Word/Scrivener (dominant drafting path). → [#54](https://github.com/freqkflag/openbook-author/issues/54) *(Wave A.2 sprint)*
3. **Print PDF presets (trim, margins, page numbers)** — completes the “publish ready” story beyond browser print. *(Wave A.2 sprint)*
4. **PWA offline mode** — matches local-first brand; roadmap item #23. → [#27](https://github.com/freqkflag/openbook-author/issues/27) *(Wave A.2 sprint)*
5. **EPUBCheck + Kindle Previewer hooks in publish readiness** — turns partial validation into trust. → [#56](https://github.com/freqkflag/openbook-author/issues/56) *(Wave A.2 sprint)*
6. ~~**Hierarchical TOC / parts ([#49](https://github.com/freqkflag/openbook-author/issues/49))**~~ — ✅ shipped Wave B
7. ~~**Deepen IBA import with diagnostics**~~ — ✅ shipped Wave B ([#19](https://github.com/freqkflag/openbook-author/issues/19))
8. ~~**AI RAG consistency pass (local-first, Ollama-friendly)**~~ — ✅ shipped Wave B ([#60](https://github.com/freqkflag/openbook-author/issues/60))
9. **ADR before production collab / signed marketplace** — Wave C pilots ship; scale-up needs ADR-0008/0009 follow-through; `.openbook` stays canonical.
10. ~~Footnotes/endnotes + tables~~ — ✅ shipped Wave A.1 ([#8](https://github.com/freqkflag/openbook-author/issues/8) · close)

---

## 7. Items Requiring ADRs Before Build

| Initiative | Why ADR |
|------------|---------|
| **Realtime collab (Yjs)** | Conflict resolution, auth, export from merged state |
| **Plugin/extension marketplace** | Sandboxing, versioning, EPUB transform contract (extends ADR-0002) |
| **Cloud sync / self-hosted backend** | Identity, encryption, offline merge, FOSS hosting story |
| **Fixed-layout canvas** | New editor paradigm, export pipeline split (extends ADR-0003) |
| **Git-native project mode** | Dual storage model vs localStorage cache + `.openbook` — [ADR-0005](adr/ADR-0005-git-native-project-mode.md) (Accepted) |
| **Self-hosted backup / sync** | Credentials, conflict model, opt-in FOSS hosting — [ADR-0006](adr/ADR-0006-self-hosted-sync.md) (Accepted) |

Existing ADRs: guidebook blocks (0001), widgets (0002), EPUB pipeline (0003), agent handoff (0004), git-native mode (0005), self-hosted sync (0006).

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| **Scope creep chasing iBooks** | Fixed-layout + full widget parity is XL; prioritize reflowable + KBP first |
| **Cloud sync commoditizes FOSS** | Default local-first; sync opt-in, self-hosted |
| **AI API keys in browser** | Document tradeoff; Electron could proxy; Ollama as privacy default |
| **EPUB `<details>` widget support** | Document reader compatibility; offer fallback markup |
| **Landscape “fixed” without canvas** | Misleading metadata — fix UX label or deliver real fixed-layout |
| **Small team vs Atticus feature surface** | Theme + DOCX + PWA = 80% author satisfaction (footnotes shipped A.1) |

---

## 9. Suggested GitHub Issue Titles

1. ~~`feat: TipTap footnotes and endnotes with EPUB/KBP export transforms`~~ → ✅ [#8](https://github.com/freqkflag/openbook-author/issues/8) shipped Wave A.1
2. ~~`feat: TipTap tables extension with export and publish readiness checks`~~ → ✅ shipped Wave A.1 (same issue)
3. `feat: Export theme system — built-in themes and custom CSS override` → [#55](https://github.com/freqkflag/openbook-author/issues/55)
4. `feat: DOCX import for manuscript migration from Word/Scrivener` → [#54](https://github.com/freqkflag/openbook-author/issues/54)
5. `feat: Print PDF presets — trim sizes, margins, and page numbers (Electron + web)`
6. `feat: PWA service worker and offline editor shell` → [#27](https://github.com/freqkflag/openbook-author/issues/27)
7. `feat: Integrate EPUBCheck and Kindle Previewer into publish readiness flow` → [#56](https://github.com/freqkflag/openbook-author/issues/56)
8. `feat: Hierarchical TOC — parts, volumes, and nested nav (#49)` → ✅ shipped Wave B
9. `feat: IBA import diagnostics and nested chapter hierarchy preservation` → ✅ shipped Wave B ([#19](https://github.com/freqkflag/openbook-author/issues/19))
10. `feat: AI RAG consistency pass with local chapter embeddings (Ollama)` → ✅ shipped Wave B ([#60](https://github.com/freqkflag/openbook-author/issues/60))
11. `adr: Realtime collaboration architecture (Yjs + TipTap)` → ✅ ADR-0008 + Wave C prototype
12. `adr: Plugin marketplace and third-party widget SDK` → ✅ ADR-0009 + Wave C SDK preview
13. `feat: Media embed widgets — audio and video with EPUB 3 export` → ✅ shipped Wave C ([#17](https://github.com/freqkflag/openbook-author/issues/17))
14. `feat: Interactive quiz widget for EPUB 3 (iBooks parity)` → ✅ shipped Wave C ([#15](https://github.com/freqkflag/openbook-author/issues/15))
15. `feat: Fixed-layout canvas editor MVP for landscape template` → ✅ shipped Wave C ([#20](https://github.com/freqkflag/openbook-author/issues/20))
16. `feat: Git-friendly project folder mode with save-to-directory` → ✅ shipped Wave B ([#59](https://github.com/freqkflag/openbook-author/issues/59))
17. `chore: Add axe-core accessibility checks to CI pipeline`
18. `feat: EPUB 3.3 package metadata and accessibility properties upgrade` → ✅ shipped Wave B ([#62](https://github.com/freqkflag/openbook-author/issues/62))
19. `feat: WASM Typst PDF export pilot (Electron)` → ✅ shipped Wave C ([#64](https://github.com/freqkflag/openbook-author/issues/64))
20. `feat: W3C Audiobook manifest export from chapter audio/TTS` → ✅ shipped Wave C ([#66](https://github.com/freqkflag/openbook-author/issues/66))

---

## 10. Evidence (key code references)

EPUB 3 pipeline with fixed-layout metadata flag:

```496:580:src/lib/epub.ts
  const isFixed = book.layoutMode === "landscape";
  // ...
    ${isFixed ? '<meta property="rendition:layout">pre-paginated</meta>' : '<meta property="rendition:layout">reflowable</meta>'}
```

AI book-aware context:

```44:60:src/lib/ai-context.ts
/** Full book-aware context string for AI requests */
export function buildBookAIContext(
  book: Pick<Book, "metadata" | "chapters">,
  currentChapterId: string
): string {
  const parts: string[] = [
    `Book title: ${book.metadata.title}`,
    `Author: ${book.metadata.author || "Unknown"}`,
  ];
  // ... TOC + prior chapter excerpts
```

Widget architecture (ADR-0002):

```14:23:docs/adr/ADR-0002-widget-plugin-api.md
Interactive widgets are **TipTap node extensions** under `src/components/extensions/`:
- `PopupWidget` — `<details>`-based tap-to-reveal content
- `GalleryWidget` — multi-image carousel with captions
New widgets follow the pattern: TipTap extension → editor toolbar insert → HTML `data-*` attributes → EPUB transform function.
```

Roadmap honesty (`docs/FUTURE_FEATURES.md`):

```82:95:docs/FUTURE_FEATURES.md
## iBooks Author parity
**13. More interactive widgets** ✅ *(Wave C)*
**14. Fixed-layout (landscape) editor** ✅ *(Wave C MVP)*
**15. Better IBA import** ✅ *(Wave B)*
```
