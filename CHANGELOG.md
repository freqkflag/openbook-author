# Changelog

All notable user-facing changes to OpenBook Author are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

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

### Planned

- Tables, footnotes, and endnotes (TipTap extensions) — deferred from this wave (#6)

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
