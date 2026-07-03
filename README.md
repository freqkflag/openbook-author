# OpenBook Author

A modern, **free and open-source** book authoring studio — a FOSS alternative to Apple's discontinued iBooks Author.

Create beautiful EPUB books with rich text editing, chapter management, templates, and integrated AI writing assistance.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

### Book Authoring (iBooks Author-inspired)
- **Templates** — Portrait, Landscape, Textbook, **Guidebook**, and Blank
- **KBP formatting** — Kindle Book Publishing profile with KDP-optimized typography
- **Rich text editor** — Headings, lists, quotes, images, links, alignment, highlights, **tables**, **footnotes**, and **endnotes**
- **Chapter management** — Add, rename, reorder, and delete chapters
- **Book metadata** — Title, author, publisher, language, description
- **EPUB export** — Standard EPUB 3 with table of contents, cover page, and embedded assets
- **`.openbook` packages** — Zip-based project format with `book.json` and `assets/` folder
- **Save / Open** — Electron-native file dialogs with web download/upload fallback
- **Asset manager** — Upload, preview, and insert images; set cover from assets panel
- **Cover page** — Live cover preview in Book Properties; included in preview and export
- **Full-book preview** — Scroll through cover + all sections in read-only mode
- **Project export/import** — Legacy `.openbook.json` import still supported

### File-Based Projects (v0.2)
- **`.openbook` format** — Zip archive containing `manifest.json`, `book.json`, and `assets/`
- **Save** (`Cmd+S`) — Write package to disk (Electron) or download (web)
- **Save As** — Choose a new path or filename
- **Open Book** — Load an existing `.openbook` from the dashboard or File menu
- **Auto-save** — Debounced save to disk when a `packagePath` is set (Electron)
- Chapter HTML references images as `assets/{filename}` instead of inline base64

### KBP — Kindle Book Publishing
- **KBP profile** — First-line indents, drop caps, scene breaks, chapter numbering
- **Guidebook callouts** — Tip boxes, warning notes, numbered step blocks
- **Guidebook blocks** — Structured content atoms for reference-style books:
  - **Trail stop** — Waypoints with mile marker, elevation, notes, and amenities
  - **Workshop** — Reflective exercises with short or long response prompts
  - **Cheat sheet** — Label/value pairs in a 2- or 3-column quick-reference grid
- **KBP export** — `.kbp` zip package with KDP-ready EPUB, HTML chapters, and stylesheet
- Enable in Book Properties or use the **Guidebook** template (KBP on by default)

The Guidebook template includes four sample chapters. **Chapter 1: Getting Started** and **Trail Reference** ship with live examples of all three block types — insert more from the Guidebook section of the editor toolbar. See [docs/guidebook-blocks.md](docs/guidebook-blocks.md) for the block HTML contract and seed helpers.

### Interactive Widgets
- **Popup widgets** — Tap-to-reveal content blocks (like iBooks Author pop-ups)
- **Image galleries** — Multi-image carousel widgets with captions
- Widgets export to EPUB as `<details>` popups and styled gallery figures

### AI Writing Assistant
- **Continue writing** — AI picks up where you left off
- **Improve & rewrite** — Polish prose and refresh voice
- **Expand & summarize** — Add depth or condense content
- **Generate outlines** — Structured JSON outline converted to HTML
- **Consistency check** — Tone, timeline, and fact continuity pass (structured JSON)
- **Generate section** — Create a new section from a prompt (book-aware context)
- **Custom prompts** — Ask anything about your content
- **Voice profile & style guide** — Consistent tone across AI actions
- **Multi-provider** — OpenAI, Anthropic Claude, or local Ollama with model presets and online/offline badge

### iBooks Author Import
- **Import IBA** — Open `.iba`, `.book`, `.ibatemplate`, and `.booktemplate` files
- Extracts metadata, chapters, text, and embedded images
- Converts to editable reflowable content (layout/widgets not preserved)

### Word / Scrivener Import
- **Import DOCX** — Dashboard **Import DOCX** for `.docx` manuscripts
- Extracts title, author, and body; splits on Heading 1 (or Heading 2) into chapters
- Preserves headings, bold/italic, lists, blockquotes, and links
- Inline images extracted to the book `assets/` folder
- Import report lists tables and footnotes that need manual review

### Native macOS App (Electron)
- Run as a native desktop app with `npm run electron:dev`
- Build a `.dmg` installer with `npm run electron:build`
- Native menu bar with Open / Save / Save As, hidden inset title bar, dark mode support

## Keyboard Shortcuts

OpenBook Author supports standard editor shortcuts plus book-level actions. Press **⌘/** (or **?** when not typing in a field) to open the in-app cheat sheet.

### Book & navigation
| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl + S | Save book |
| ⌘/Ctrl + P | Toggle chapter preview |
| ⌘/Ctrl + Alt + ↑ | Previous section |
| ⌘/Ctrl + Alt + ↓ | Next section |
| ⌘/Ctrl + / or ? | Show keyboard shortcuts |

### Formatting (in editor)
| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl + B | Bold |
| ⌘/Ctrl + I | Italic |
| ⌘/Ctrl + U | Underline |
| ⌘/Ctrl + Shift + S | Strikethrough |
| ⌘/Ctrl + Shift + H | Highlight |
| ⌘/Ctrl + Alt + 1–3 | Heading 1–3 |
| ⌘/Ctrl + Shift + 8 | Bullet list |
| ⌘/Ctrl + Shift + 7 | Numbered list |
| ⌘/Ctrl + Shift + B | Blockquote |
| ⌘/Ctrl + Z | Undo |
| ⌘/Ctrl + Shift + Z | Redo |

## Quick Start

### Web app
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### PWA / offline mode

The web app registers a service worker (`public/sw.js`) that caches the app shell and static assets. After you load OpenBook Author once while online, you can reopen the editor offline — your books stay in `localStorage`, and `.openbook` packages still open via the file picker or Electron file dialogs.

- **Installable** — add to home screen via the browser install prompt (manifest at `/manifest.webmanifest`)
- **Offline indicator** — a banner appears when `navigator.onLine` is false; AI API calls require a connection
- **Electron** — the native app skips service worker registration (local-first desktop workflow)

### Native macOS app
```bash
npm run electron:dev
```

This launches OpenBook Author in an Electron window with native macOS chrome.

### Build macOS installer
```bash
npm run electron:build
```

Output: `dist/OpenBook Author.dmg`

## Docker

Run the production web app in a container (Next.js standalone build):

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

Build or run the image directly:

```bash
docker build -t openbook-author .
docker run --rm -p 3000:3000 openbook-author
```

## AI Setup

1. Open any book in the editor
2. Click the **AI** button in the toolbar
3. Click the gear icon to open **AI Settings**
4. Choose your provider, enter your API key (or use Ollama locally), and optionally set **Voice profile** and **Style guide**

### Ollama (free, local)
```bash
ollama pull llama3.2
ollama serve
```
1. Set provider to **Ollama (local)**
2. Pick a **model preset** (Llama 3.2, Mistral, Qwen 2.5, etc.) or enter a custom model name
3. Base URL defaults to `http://localhost:11434`
4. A **Local · Online / Offline** badge shows whether Ollama is reachable — no API key required

Structured JSON actions (**Outline**, **Consistency**) work with Ollama's JSON mode and are converted to HTML in the editor. OpenAI uses `response_format: json_object` for the same actions.

Pull any preset model before use, e.g. `ollama pull mistral` or `ollama pull qwen2.5`.

### OpenAI
Set provider to **OpenAI**, enter your API key, model e.g. `gpt-4o-mini`.

### Anthropic
Set provider to **Anthropic**, enter your API key, model e.g. `claude-3-5-haiku-20241022`.

## Tech Stack

- [Next.js](https://nextjs.org/) 16 + React 19 + TypeScript
- [TipTap](https://tiptap.dev/) rich text editor
- [Zustand](https://zustand.docs.pmnd.rs/) state management
- [JSZip](https://stuk.github.io/jszip/) EPUB generation
- [Tailwind CSS](https://tailwindcss.com/) styling

## Export

- **EPUB** — Click the EPUB button in the editor toolbar (includes cover and embedded images)
- **KBP** — Kindle Book Publishing package when KBP profile is enabled
- **`.openbook`** — Save from the editor toolbar (Save / Save As) for full project backup

## `.openbook` Package Layout

```
my-book.openbook/   (zip archive)
├── manifest.json     # format version, app version, exportedAt
├── book.json         # metadata, chapters, kbpSettings (no inline blobs)
└── assets/
    ├── cover.jpg
    └── ...
```

## Developer documentation

| Doc | Description |
|-----|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, PR workflow, conventions |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |
| [docs/FUTURE_FEATURES.md](docs/FUTURE_FEATURES.md) | Roadmap and planned improvements |
| [docs/COMPETITIVE_AUDIT.md](docs/COMPETITIVE_AUDIT.md) | Competitive landscape, gap matrix, and roadmap waves |
| [docs/WAVE-A-STATUS-COMPLETE.md](docs/WAVE-A-STATUS-COMPLETE.md) | Wave A complete — product-lane + competitive-audit verification, issue closure |
| [docs/guidebook-blocks.md](docs/guidebook-blocks.md) | Guidebook block types, HTML contract, seed helpers |
| [docs/adr/](docs/adr/) | Architecture decision records |
| [CHANGELOG.md](CHANGELOG.md) | User-facing release notes |

## License

MIT — Free and open source. Use, modify, and distribute freely.

## Comparison with iBooks Author

| Feature | iBooks Author | OpenBook Author |
|---------|--------------|-----------------|
| Cost | Free (discontinued) | Free & open source |
| Platform | macOS only | Any browser |
| EPUB export | ✅ | ✅ |
| Templates | ✅ | ✅ |
| Widgets | ✅ (proprietary) | ✅ Pop-ups & galleries |
| IBA import | — | ✅ |
| AI assistance | ❌ | ✅ |
| Active development | ❌ (2018) | ✅ |
