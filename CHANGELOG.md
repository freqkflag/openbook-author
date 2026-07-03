# Changelog

All notable user-facing changes to OpenBook Author are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **PWA offline shell** — service worker caches app shell and static assets; offline indicator when `navigator.onLine` is false; `.openbook` and localStorage books work offline ([#27](https://github.com/freqkflag/openbook-author/issues/27))
- **Export theme system** — five built-in presets (Classic Serif, Modern Sans, Textbook, Guidebook, Minimal) in Book Properties; applies to EPUB, KBP, and print/PDF; optional custom CSS override persisted in `book.json`; publish readiness warns on broken `assets/` refs in custom CSS ([#55](https://github.com/freqkflag/openbook-author/issues/55))
- **DOCX import** — Dashboard **Import DOCX** for Word/Scrivener migration; mammoth HTML conversion, heading-based chapter split, inline images to `assets/`, import report for tables and footnotes ([#54](https://github.com/freqkflag/openbook-author/issues/54))
- **Tables, footnotes, and endnotes** — TipTap table kit (3×3 insert, row/column controls); footnote/endnote inline refs with EPUB 3 noteref export, endnotes section, EPUB import reverse transform, and publish readiness checks ([#8](https://github.com/freqkflag/openbook-author/issues/8))
- **Wave A completion:** axe-core accessibility tests on export HTML fixtures (`a11y-export.test.ts`); EPUB structural validation in publish readiness (`epub-validation.ts`); Wave A status doc
- **AI + Platform Wave 1:** voice profile and style guide in AI settings (injected into `/api/ai` system prompt); book-aware AI context (TOC + prior chapter excerpts); **Generate section** AI action; relative last-saved badge with sessionStorage crash buffer on localStorage failure; heading hierarchy warnings and missing alt text as export-blocking errors; IBA import fixture test; production Docker + docker-compose (#18–#26)
- **Print PDF presets** — US Letter, 6×9 trim, and A5 with margin options, page numbers, and TOC dot leaders; `PrintPdfModal` in export flow; Electron `printToPDF` uses CSS `@page` presets
- Store metadata fields: ISBN, BISAC, keywords, age rating, series — in Book Properties, EPUB OPF, and KBP manifest (#18)
- Extended publish readiness: duplicate TOC titles, empty TOC, KBP H1 checks, KBP store metadata warnings (#17)
- KBP export now runs through the same readiness gate as EPUB/PDF (#17)
- Click-to-chapter navigation from publish readiness issues in Book Properties
- Keyboard shortcuts cheat sheet documents shipped bindings; `Cmd+Shift+P` toggles full-book preview (#7)
- Grip-handle chapter reorder in sidebar with `aria-grabbed` (#10)
- Section templates: Resources, Learning Objectives, Practice Quiz, Bibliography (#12)
- Book-wide find/replace modal (`Cmd+Shift+F`) with `book-search` utilities (#9)
- Custom section templates saved to localStorage; **My templates** in Add Section picker (#11)
- Browser spellcheck on editor using book language metadata; AI **Clarity pass** label (#8)
- Copyright, dedication, and title page front matter sections with EPUB/KBP export support (#5)
- EPUB import from dashboard (metadata, spine chapters, embedded images)
- EPUB widget reverse-transform on import (popups, galleries, guidebook blocks)
- Editor link and popup insert modals (replacing `window.prompt`)
- Publish readiness checks before EPUB/KBP export (missing cover, empty chapters, metadata gaps)
- `CONTRIBUTING.md`, `SECURITY.md`, `.env.example`, PR template, and GitHub Actions CI (lint, test, build)
- `docs/FUTURE_FEATURES.md` roadmap
- Guidebook template seed module (`src/lib/guidebook-seed.ts`) with reusable sample payloads and chapter builders
- **Trail Reference** sample chapter in the Guidebook template — demonstrates trail stop, workshop, and cheat sheet blocks side by side
- `serializeGuidebookBlockToHtml()` helper for generating TipTap-compatible `<aside data-guidebook="…">` markup
- Developer reference: [docs/guidebook-blocks.md](docs/guidebook-blocks.md)
- Competitive & tech feature audit: [docs/COMPETITIVE_AUDIT.md](docs/COMPETITIVE_AUDIT.md) — gap matrix, roadmap waves, and issue tracking
- Wave A status tracker: [docs/WAVE-A-STATUS.md](docs/WAVE-A-STATUS.md) — product-lane vs competitive-audit completion and issue closure guidance

### Planned

- _(none — tables/footnotes/endnotes shipped in Wave A completion)_

### Changed

- Guidebook template **Chapter 1: Getting Started** now includes structured guidebook blocks (trail stop, workshop, cheat sheet) and a tip callout instead of placeholder step callouts
- **About This Guide** chapter lists trail stop, workshop, and cheat sheet blocks in its feature overview
- Local dev workflow: `npm run validate` (lint + test), `npm run lint:fix`; ESLint config excludes Electron CommonJS entrypoints
- Cover upload directly from Book Properties panel

## [0.2.0]

### Added

- `.openbook` zip package format with `manifest.json`, `book.json`, and `assets/`
- Save / Save As with Electron file dialogs and web download fallback
- Auto-save when a package path is set (Electron)
- Guidebook template with KBP formatting profile
- Guidebook block prototype at `/prototype/guidebook`
- KBP export (`.kbp` zip) for Kindle Direct Publishing
- Popup widgets and image galleries
- iBooks Author (`.iba`) import
- Native macOS Electron app (`npm run electron:dev`, `npm run electron:build`)
