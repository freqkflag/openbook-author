# Contributing to OpenBook Author

Thank you for helping improve OpenBook Author — a FOSS alternative to iBooks Author.

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm** (comes with Node)

## Getting started

```bash
git clone https://github.com/freqkflag/openbook-author.git
cd openbook-author
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Electron (macOS)

```bash
npm run electron:dev
```

Uses the Next.js app on port **3847** by default. Override with `OPENBOOK_PORT` (see [.env.example](.env.example)).

## Development commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Web app (port 3000) |
| `npm run dev:web` | Web app on port 3847 (Electron pairing) |
| `npm run electron:dev` | Native macOS shell + dev server |
| `npm test` | Run Vitest unit tests |
| `npm run build` | Production Next.js build |
| `npm run lint` | ESLint |

CI runs **lint**, **test**, and **build** on pull requests to `main`. Run `npm run validate` locally before opening a PR (`lint` + `test`). Use `npm run lint:fix` for auto-fixable issues.

## Making changes

1. **Fork** and create a branch from `main` (e.g. `feat/my-feature`, `fix/export-regression`).
2. **Read ADRs** before architectural changes — see [docs/adr/](docs/adr/README.md).
3. **Keep scope focused** — one feature or fix per PR when possible.
4. **Match existing patterns** in `src/` (TipTap extensions, Zustand store, `src/lib/` for I/O).
5. **Add or update tests** when changing export, import, or book data shapes.
6. **Update [CHANGELOG.md](CHANGELOG.md)** for user-visible changes (Unreleased section).

### Export / preview changes

If you touch `src/lib/epub.ts`, guidebook blocks, or print preview CSS, verify:

- `npm test`
- Editor → print preview → EPUB export path (see [ADR-0003](docs/adr/ADR-0003-epub-export-pipeline.md))

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) when practical:

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `test:` tests only
- `chore:` tooling, deps

Reference GitHub issues when applicable: `feat: add EPUB import warnings (#6)`.

## Pull requests

- Fill out the PR template checklist.
- Link related issues.
- Ensure CI passes.
- For UI changes, include a brief description of what to test manually.

## Project layout (quick reference)

| Path | Role |
|------|------|
| `src/app/` | Next.js App Router pages |
| `src/components/` | React UI + TipTap extensions |
| `src/store/book-store.ts` | Book state, save/open, assets |
| `src/lib/` | EPUB, import, templates, package I/O |
| `src/types/` | TypeScript types |
| `electron/` | macOS desktop shell |
| `docs/adr/` | Architecture decision records |

## AI provider keys

API keys for OpenAI, Anthropic, and Ollama are configured **in the browser** via the in-app AI settings panel (stored in localStorage). They are **not** read from server environment variables. Do not commit keys or `.env` files with secrets.

## Questions

Open a [GitHub Discussion](https://github.com/freqkflag/openbook-author/discussions) or issue if something is unclear.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
