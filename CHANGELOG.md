# Changelog

All notable user-facing changes to OpenBook Author are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Guidebook template seed module (`src/lib/guidebook-seed.ts`) with reusable sample payloads and chapter builders
- **Trail Reference** sample chapter in the Guidebook template — demonstrates trail stop, workshop, and cheat sheet blocks side by side
- `serializeGuidebookBlockToHtml()` helper for generating TipTap-compatible `<aside data-guidebook="…">` markup
- Developer reference: [docs/guidebook-blocks.md](docs/guidebook-blocks.md)

### Changed

- Guidebook template **Chapter 1: Getting Started** now includes structured guidebook blocks (trail stop, workshop, cheat sheet) and a tip callout instead of placeholder step callouts
- **About This Guide** chapter lists trail stop, workshop, and cheat sheet blocks in its feature overview

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
