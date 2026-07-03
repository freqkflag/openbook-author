# Wave A Status — Complete

**Branch:** `main` · **As of:** July 2026 · **Verified:** 2026-07-03  
**Sources:** [COMPETITIVE_AUDIT.md](COMPETITIVE_AUDIT.md) §5 Wave A, [FUTURE_FEATURES.md](FUTURE_FEATURES.md), [CHANGELOG.md](../CHANGELOG.md) `[Unreleased]`

Wave A has two lenses, split into two phases:

1. **Competitive-audit Wave A** — seven strategic gaps (footnotes, themes, DOCX, print presets, PWA, axe CI, store validators).
2. **Product-lane Wave A** — shipped platform, AI, guidebook, and test hardening on `main` (AI + Platform Wave 1, guidebook seed, export snapshots, hydrate test, orchestration).

| Phase | Scope | Status |
|-------|-------|--------|
| **Wave A.1** | Product-lane deliveries + competitive gaps 1, 6, and partial 4 & 7 | ✅ Shipped on `main` |
| **Wave A.2** | Remaining competitive gaps 2–5 and 7 completion (themes, DOCX, PWA, PDF presets, EPUBCheck) | ✅ Shipped on `main` (July 2026) |

This document tracks both lenses, clarifies publish-readiness severity, and recommends GitHub issue closure.

---

## Publish readiness — warnings vs errors

The publish readiness panel uses two severities. Only **errors** block export; **warnings** are advisory.

| Severity | Blocks export? | Examples (Wave A.1) |
|----------|----------------|---------------------|
| **Error** | Yes | Missing image alt text; heading hierarchy violations (skip levels, multiple H1) |
| **Warning** | No | Duplicate TOC titles; KBP H1 checks; store metadata gaps (ISBN, BISAC); empty footnotes/endnotes; headerless tables |

Wave A.2 adds EPUBCheck / Kindle Previewer hooks ([#56](https://github.com/freqkflag/openbook-author/issues/56)) — post-export structural validation with actionable messages; full Java EPUBCheck remains an optional local step documented in the panel.

---

## Wave A.1 — shipped on `main`

### Product-lane deliveries

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
| **PDF export hardening** | `pdf-export.test.ts`, `print-presets.ts`, Electron `printToPDF` presets | #16 · issue [#7](https://github.com/freqkflag/openbook-author/issues/7) ✅ closed |
| **Docker deployment** | `Dockerfile`, `docker-compose.yml` | #26 |
| **Agent orchestration** | Merge lanes, `docs/agent-router.md`, ADR-0004 | Issue [#37](https://github.com/freqkflag/openbook-author/issues/37) ✅ merged |

Also on `main` from prior releases: EPUB import, front matter, find/replace, custom section templates, store metadata (ISBN/BISAC/keywords), keyboard shortcuts, chapter reorder, section templates.

**Test count:** 220 tests across 37 files (`npm test`, verified 2026-07-03).

### Competitive-audit Wave A.1 — shipped gaps

| # | Item | Status | Tracking |
|---|------|--------|----------|
| 1 | Footnotes/endnotes + tables | ✅ Shipped | [#8](https://github.com/freqkflag/openbook-author/issues/8) — **close** |
| 4 | Print PDF hardening (trim, margins, TOC leaders) | ✅ Shipped | Trim presets (US Letter, 6×9, A5), margins, page numbers, TOC leaders; Electron `printToPDF` ([#7](https://github.com/freqkflag/openbook-author/issues/7)); bleed/CMYK out of scope |
| 6 | axe-core in CI | ✅ Shipped | `src/lib/a11y-export.test.ts` — export HTML fixtures in Vitest/CI |
| 7 | EPUBCheck / Kindle Previewer hooks | 🟡 Partial (A.1) | Structural EPUB validation in readiness panel + `epub-validation.ts`; full hooks → Wave A.2 ([#56](https://github.com/freqkflag/openbook-author/issues/56)) |

---

## Wave A.2 — shipped (July 2026)

**Goal:** Close remaining competitive-audit gaps so authors can finish and ship a reflowable book without leaving OpenBook.

Parallel implementation tracks (July 2026):

| Track | Competitive-audit # | Issue | Status |
|-------|-------------------|-------|--------|
| Export theme system (3–5 themes + CSS hook) | 2 | [#55](https://github.com/freqkflag/openbook-author/issues/55) | ✅ Shipped — `export-themes.ts`, Book Properties selector, EPUB/KBP/PDF |
| DOCX import | 3 | [#54](https://github.com/freqkflag/openbook-author/issues/54) | ✅ Shipped — `docx-import.ts`, dashboard **Import DOCX**, mammoth HTML, asset extraction |
| PWA offline shell | 5 | [#27](https://github.com/freqkflag/openbook-author/issues/27) | ✅ Shipped — `public/sw.js`, offline indicator, `src/lib/pwa.ts` |
| EPUBCheck / Kindle Previewer integration | 7 | [#56](https://github.com/freqkflag/openbook-author/issues/56) | ✅ Shipped — `epub-validation.ts`, post-export validation, macOS/Electron CLI docs in readiness panel |
| Print PDF presets (trim, margins, TOC leaders) | 4 | _(no dedicated issue)_ | ✅ Shipped — `print-presets.ts`, `PrintPdfModal`, Electron `printToPDF` presets |

Related umbrella issues: [#51](https://github.com/freqkflag/openbook-author/issues/51), [#52](https://github.com/freqkflag/openbook-author/issues/52), [#53](https://github.com/freqkflag/openbook-author/issues/53) — close with #55 / #54 / #56.

**Wave A.2 exit criteria:** ✅ All five tracks on `main`; competitive-audit Wave A checklist complete.

---

## GitHub issues — close as shipped

These issues describe work that is on `main`. Close with a note pointing to `CHANGELOG.md` `[Unreleased]` or the relevant test/module.

| Issue | Title |
|-------|-------|
| [#5](https://github.com/freqkflag/openbook-author/issues/5) | Front matter: copyright & dedication section types |
| [#6](https://github.com/freqkflag/openbook-author/issues/6) | EPUB import |
| [#7](https://github.com/freqkflag/openbook-author/issues/7) | PDF export *(already closed)* |
| [#8](https://github.com/freqkflag/openbook-author/issues/8) | Tables, footnotes, and endnotes — Wave A.1 competitive gap #1 |
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
| [#27](https://github.com/freqkflag/openbook-author/issues/27) | PWA / offline mode — Wave A.2 competitive gap #5 |
| [#55](https://github.com/freqkflag/openbook-author/issues/55) | Export theme system — Wave A.2 competitive gap #2 |
| [#51](https://github.com/freqkflag/openbook-author/issues/51) | Export theme system umbrella — close with #55 |
| [#54](https://github.com/freqkflag/openbook-author/issues/54) | DOCX import — Wave A.2 competitive gap #3 |
| [#52](https://github.com/freqkflag/openbook-author/issues/52) | DOCX import umbrella — close with #54 |

Optional close (core scope shipped; polish may continue):

| Issue | Title | Note |
|-------|-------|------|
| [#56](https://github.com/freqkflag/openbook-author/issues/56) | EPUBCheck / Kindle Previewer hooks — Wave A.2 competitive gap #7 |
| [#10](https://github.com/freqkflag/openbook-author/issues/10) | Publish readiness validation panel | Panel + Wave A checks shipped; EPUBCheck hooks in #56 |

---

## GitHub issues — keep open (Wave A.2)

| Issue | Title | Reason |
|-------|-------|--------|
| [#28](https://github.com/freqkflag/openbook-author/issues/28) | Export and import test suite | Snapshots/hydrate shipped; full matrix + axe fixtures remain |
| [#29](https://github.com/freqkflag/openbook-author/issues/29) | Accessibility: WCAG preview, heading hierarchy, required alt text | Export gate shipped; WCAG preview remains |

iBooks parity and Wave C items ([#15](https://github.com/freqkflag/openbook-author/issues/15)–[#18](https://github.com/freqkflag/openbook-author/issues/18), [#20](https://github.com/freqkflag/openbook-author/issues/20), etc.) stay open — out of Wave A scope. Wave B items [#19](https://github.com/freqkflag/openbook-author/issues/19) and [#49](https://github.com/freqkflag/openbook-author/issues/49) are ✅ shipped on `main`.

---

## Next steps

Wave A is **complete** on `main`. Wave B and Wave C are also **complete** ([c8caf32](https://github.com/freqkflag/openbook-author/commit/c8caf32)) — see [WAVE-B-STATUS.md](WAVE-B-STATUS.md) and [WAVE-C-STATUS.md](WAVE-C-STATUS.md).

1. Optional polish: WCAG preview ([#29](https://github.com/freqkflag/openbook-author/issues/29)), full export/import test matrix ([#28](https://github.com/freqkflag/openbook-author/issues/28)).
2. Close remaining GitHub issues listed above with CHANGELOG pointers.
3. Tag release when `[Unreleased]` CHANGELOG is ready.

---

## Verification (2026-07-03)

**Audit:** Codebase + test suite on `main` · **Commands:** `npm test` ✅ (220/220) · `npm run build` ✅

| Claim | Evidence file | Test file | Pass/Fail | Notes |
|-------|---------------|-----------|-----------|-------|
| **AI Wave 1** — book-aware context, Generate section, voice profile | `src/lib/ai-context.ts`, `src/components/AIAssistant.tsx` | `src/lib/ai-context.test.ts` | ✅ Pass | 5 tests |
| **Auto-save badge + crash recovery** | `src/store/book-store.ts`, `src/lib/storage.ts` (sessionStorage buffer), `src/components/SaveStatusBadge.tsx` | `src/store/book-store.save.test.ts` | ✅ Pass | [#26](https://github.com/freqkflag/openbook-author/issues/26) closed |
| **Publish readiness extensions** — duplicate TOC, KBP H1, store metadata, click-to-chapter | `src/lib/publish-readiness.ts`, `src/components/PublishReadinessPanel.tsx` | `src/lib/publish-readiness.test.ts` | ✅ Pass | 14 tests |
| **Accessibility export gate** — heading hierarchy + missing alt blocking | `src/lib/publish-readiness.ts` | `src/lib/a11y-export.test.ts`, `publish-readiness.test.ts` | ✅ Pass | axe-core on export HTML |
| **Guidebook template seed** — Trail Reference chapter | `src/lib/guidebook-seed.ts` | `src/lib/guidebook-seed.test.ts` | ✅ Pass | ADR-0001 present |
| **EPUB export snapshots** | `src/lib/epub.ts` | `src/lib/epub-export.snapshots.test.ts` | ✅ Pass | 6 snapshot tests |
| **Store hydrate test** — AI settings merge | `src/store/book-store.ts` | `src/store/book-store.hydrate.test.ts` | ✅ Pass | 1 test |
| **IBA import fixture test** | `src/lib/iba-import.ts` | `src/lib/iba-import.test.ts` | ✅ Pass | 5 tests |
| **PDF export hardening** — presets, Electron printToPDF | `src/lib/pdf-export.ts`, `src/lib/print-presets.ts`, `src/components/PrintPdfModal.tsx` | `src/lib/pdf-export.test.ts`, `src/lib/print-presets.test.ts` | ✅ Pass | [#7](https://github.com/freqkflag/openbook-author/issues/7) closed |
| **Docker deployment** | `Dockerfile`, `docker-compose.yml` | `scripts/deploy-test.sh` (`npm run test:deploy`) | ✅ Pass | Forgejo homelab CI: `.forgejo/workflows/docker-smoke.yml` |
| **Agent orchestration** — merge lanes, router doc, ADR-0004 | `src/studio/orchestrator/`, `docs/agent-router.md` | `src/studio/orchestrator/orchestrator.test.ts` | ✅ Pass | [#37](https://github.com/freqkflag/openbook-author/issues/37) merged |
| **Competitive #1** — footnotes/endnotes + tables | `src/lib/note-export.ts`, TipTap extensions | `src/lib/tables-notes-readiness.test.ts` | ✅ Pass | [#8](https://github.com/freqkflag/openbook-author/issues/8) closed |
| **Competitive #4 (A.1 partial)** — print PDF trim/margins/TOC leaders | `src/lib/print-presets.ts` | `src/lib/print-presets.test.ts` | ✅ Pass | Full presets shipped in A.2 |
| **Competitive #6** — axe-core in CI | `src/lib/a11y-export.test.ts` | `src/lib/a11y-export.test.ts` | ✅ Pass | 5 axe fixture tests |
| **Competitive #7 (A.1 partial)** — EPUB structural validation | `src/lib/epub-validation.ts` | `src/lib/epub-validation.test.ts` | ✅ Pass | Full hooks shipped in A.2 |
| **A.2 #2** — export theme system | `src/lib/export-themes.ts` | `src/lib/export-themes.test.ts` | ✅ Pass | [#55](https://github.com/freqkflag/openbook-author/issues/55) closed |
| **A.2 #3** — DOCX import | `src/lib/docx-import.ts`, dashboard Import DOCX in `src/app/page.tsx` | `src/lib/docx-import.test.ts` | ✅ Pass | [#54](https://github.com/freqkflag/openbook-author/issues/54) closed |
| **A.2 #5** — PWA offline shell | `public/sw.js`, `src/lib/pwa.ts`, `src/components/OfflineIndicator.tsx` | `src/lib/pwa.test.ts` | ✅ Pass | [#27](https://github.com/freqkflag/openbook-author/issues/27) closed |
| **A.2 #7 complete** — EPUBCheck / Kindle Previewer hooks | `src/lib/epub-validation.ts`, readiness panel | `src/lib/epub-validation.test.ts` | ✅ Pass | [#56](https://github.com/freqkflag/openbook-author/issues/56) closed |
| **A.2 #4 complete** — print PDF presets | `src/lib/print-presets.ts`, `src/components/PrintPdfModal.tsx` | `src/lib/print-presets.test.ts` | ✅ Pass | Electron `printToPDF` mapping tested |

**Summary:** 19/19 shipped claims verified. No failures. Test inventory updated from 211/32 (July 2026 draft) to **220 tests / 37 files** at verification time.
