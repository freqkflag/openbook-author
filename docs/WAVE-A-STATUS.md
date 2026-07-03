# Wave A Status

**Branch:** `main` · **As of:** July 2026  
**Sources:** [COMPETITIVE_AUDIT.md](COMPETITIVE_AUDIT.md) §5 Wave A, [FUTURE_FEATURES.md](FUTURE_FEATURES.md), [CHANGELOG.md](../CHANGELOG.md) `[Unreleased]`

Wave A has two lenses:

1. **Competitive-audit Wave A** — seven strategic gaps (footnotes, themes, DOCX, print presets, PWA, axe CI, store validators).
2. **Product-lane Wave A** — shipped platform, AI, guidebook, and test hardening on `main` (AI + Platform Wave 1, guidebook seed, export snapshots, hydrate test, orchestration).

This document tracks both and recommends GitHub issue closure.

---

## Product-lane Wave A — shipped on `main`

| Deliverable | Evidence | Roadmap item |
|-------------|----------|--------------|
| **AI Wave 1** — book-aware context, Generate section, voice profile + style guide | `src/lib/ai-context.ts`, AI panel, `ai-context.test.ts` | FUTURE_FEATURES #19–21 |
| **Auto-save badge + crash recovery** | `book-store.ts`, `sessionStorage` buffer | #22 · issue [#26](https://github.com/freqkflag/openbook-author/issues/26) ✅ closed |
| **Publish readiness extensions** | Duplicate TOC, KBP H1, store metadata warnings, click-to-chapter | #17 (partial) |
| **Accessibility export gate** | Heading hierarchy + missing alt export-blocking | #25 (partial) |
| **Guidebook template seed** | `src/lib/guidebook-seed.ts`, Trail Reference chapter, ADR-0001 | Guidebook blocks (core) |
| **EPUB export snapshots** | `src/lib/epub-export.snapshots.test.ts` | #24 (partial) |
| **Store hydrate test** | `src/store/book-store.hydrate.test.ts` — AI settings merge on hydrate | #24 (partial) |
| **IBA import fixture test** | `src/lib/iba-import.test.ts` | #24 (partial) |
| **PDF export hardening** | `pdf-export.test.ts`, Electron `printToPDF` | #16 · issue [#7](https://github.com/freqkflag/openbook-author/issues/7) ✅ closed |
| **Docker deployment** | `Dockerfile`, `docker-compose.yml` | #26 |
| **Agent orchestration** | Merge lanes, `docs/agent-router.md`, ADR-0004 | Issue [#37](https://github.com/freqkflag/openbook-author/issues/37) ✅ merged |

Also on `main` from prior releases (Wave A closure targets): EPUB import, front matter, find/replace, custom section templates, store metadata (ISBN/BISAC/keywords), keyboard shortcuts, chapter reorder, section templates.

**Test count:** 128 tests across 21 files (`npm test`).

---

## Competitive-audit Wave A — gap checklist

From [COMPETITIVE_AUDIT.md](COMPETITIVE_AUDIT.md) §5 — goal: *authors can finish and ship a reflowable book without leaving OpenBook.*

| # | Item | Status | Tracking |
|---|------|--------|----------|
| 1 | Footnotes/endnotes + tables | ✅ Shipped | [#8](https://github.com/freqkflag/openbook-author/issues/8) |
| 2 | Export theme system (3–5 themes + CSS hook) | ⬜ Not shipped | [#51](https://github.com/freqkflag/openbook-author/issues/51), [#55](https://github.com/freqkflag/openbook-author/issues/55) |
| 3 | DOCX import | ⬜ Not shipped | [#52](https://github.com/freqkflag/openbook-author/issues/52), [#54](https://github.com/freqkflag/openbook-author/issues/54) |
| 4 | Print PDF hardening (trim, margins, TOC leaders) | 🟡 Partial | Basic PDF + section print CSS shipped ([#7](https://github.com/freqkflag/openbook-author/issues/7)); bleed/trim presets remain |
| 5 | PWA offline shell | ⬜ Not shipped | [#27](https://github.com/freqkflag/openbook-author/issues/27) |
| 6 | axe-core in CI | ✅ Shipped | `src/lib/a11y-export.test.ts` — export HTML fixtures in Vitest/CI |
| 7 | EPUBCheck / Kindle Previewer hooks | 🟡 Partial | Structural EPUB validation in readiness panel + `epub-validation.ts`; full EPUBCheck CLI documented |

**Summary:** Product-lane Wave A delivered AI, platform reliability, guidebook seed, test infrastructure, axe-core export fixtures, and EPUB structural validation. Competitive-audit Wave A structural gaps (footnotes, themes, DOCX, PWA) remain for Wave A.2 or early Wave B.

---

## GitHub issues — close as shipped

These issues describe work that is on `main`. Close with a note pointing to `CHANGELOG.md` `[Unreleased]` or the relevant test/module.

| Issue | Title |
|-------|-------|
| [#5](https://github.com/freqkflag/openbook-author/issues/5) | Front matter: copyright & dedication section types |
| [#6](https://github.com/freqkflag/openbook-author/issues/6) | EPUB import |
| [#7](https://github.com/freqkflag/openbook-author/issues/7) | PDF export *(already closed)* |
| [#9](https://github.com/freqkflag/openbook-author/issues/9) | Search and replace across all chapters |
| [#11](https://github.com/freqkflag/openbook-author/issues/11) | Keyboard shortcuts and cheat sheet *(already closed)* |
| [#13](https://github.com/freqkflag/openbook-author/issues/13) | Drag-and-drop chapter reorder *(already closed)* |
| [#14](https://github.com/freqkflag/openbook-author/issues/14) | Custom reusable section templates |
| [#21](https://github.com/freqkflag/openbook-author/issues/21) | Store metadata (ISBN, BISAC, keywords, age rating) |
| [#23](https://github.com/freqkflag/openbook-author/issues/23) | Book-aware AI context (outline + prior chapters) |
| [#24](https://github.com/freqkflag/openbook-author/issues/24) | AI section generation tied to section picker |
| [#25](https://github.com/freqkflag/openbook-author/issues/25) | AI style guide / voice profile |
| [#26](https://github.com/freqkflag/openbook-author/issues/26) | Auto-save indicator and crash recovery *(already closed)* |
| [#37](https://github.com/freqkflag/openbook-author/issues/37) | Ownership-based agent orchestration and merge lanes *(merged)* |

Optional close (core scope shipped; polish may continue):

| Issue | Title | Note |
|-------|-------|------|
| [#10](https://github.com/freqkflag/openbook-author/issues/10) | Publish readiness validation panel | Panel + Wave A checks shipped; EPUBCheck tracked separately in #53/#56 |
| [#12](https://github.com/freqkflag/openbook-author/issues/12) | Spell check and AI clarity pass | Browser spellcheck + Clarity pass shipped |

---

## GitHub issues — keep open

| Issue | Title | Reason |
|-------|-------|--------|
| [#8](https://github.com/freqkflag/openbook-author/issues/8) | Tables, footnotes, and endnotes | Competitive-audit Wave A #1 · v0.4 |
| [#27](https://github.com/freqkflag/openbook-author/issues/27) | PWA / offline mode | Competitive-audit Wave A #5 |
| [#28](https://github.com/freqkflag/openbook-author/issues/28) | Export and import test suite | Snapshots/hydrate shipped; full matrix + axe fixtures remain |
| [#29](https://github.com/freqkflag/openbook-author/issues/29) | Accessibility: WCAG preview, heading hierarchy, required alt text | Export gate shipped; WCAG preview + axe CI remain |
| [#51](https://github.com/freqkflag/openbook-author/issues/51) / [#55](https://github.com/freqkflag/openbook-author/issues/55) | Export theme system | Competitive-audit Wave A #2 |
| [#52](https://github.com/freqkflag/openbook-author/issues/52) / [#54](https://github.com/freqkflag/openbook-author/issues/54) | DOCX import | Competitive-audit Wave A #3 |
| [#53](https://github.com/freqkflag/openbook-author/issues/53) / [#56](https://github.com/freqkflag/openbook-author/issues/56) | EPUBCheck / Kindle Previewer | Competitive-audit Wave A #7 |

iBooks parity and Wave B/C items ([#15](https://github.com/freqkflag/openbook-author/issues/15)–[#20](https://github.com/freqkflag/openbook-author/issues/20), [#49](https://github.com/freqkflag/openbook-author/issues/49), etc.) stay open — out of Wave A scope.

---

## Next steps

1. Close shipped issues listed above (batch close PR or manual triage).
2. Retarget open Wave A gap issues ([#8](https://github.com/freqkflag/openbook-author/issues/8), [#27](https://github.com/freqkflag/openbook-author/issues/27), [#51](https://github.com/freqkflag/openbook-author/issues/51)–[#56](https://github.com/freqkflag/openbook-author/issues/56)) for Wave A completion sprint.
3. Update [COMPETITIVE_AUDIT.md](COMPETITIVE_AUDIT.md) §1 inventory when footnotes/themes/DOCX land.
