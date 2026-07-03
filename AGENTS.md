<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

OpenBook Author is a Next.js 16 + React 19 web app (a FOSS book-authoring studio) with an Electron desktop wrapper. The environment (Node 22, `git`, `gh`, `python3`, `jq`) is provisioned via `.cursor/Dockerfile`; `.cursor/environment.json` runs `npm ci` on startup, so dependencies are already installed when you begin.

- **Run (dev):** `npm run dev` serves the web app on `http://localhost:3000` (Turbopack). This is the primary product surface to develop and test against. Commands are in `package.json`; setup is in `README.md`.
- **Lint / test / build:** `npm run lint` (ESLint), `npm test` (Vitest, all suites under `src/**`), `npm run build` (production build). `npm run build` and `npm run dev` share the `.next/` directory — stop the dev server before running a build to avoid clobbering it, then restart dev.
- **Pre-existing lint failures:** `npm run lint` exits non-zero on the baseline repo. The `require()` errors in `electron/*.cjs` and the `set-state-in-effect` error in `src/app/editor/[id]/page.tsx` are pre-existing, not caused by your changes — don't treat them as regressions.
- **Electron:** `npm run electron:dev` needs a GUI/display and is not runnable headless in the cloud VM. Verify UI changes through the web app in a browser instead.
- **AI Assistant:** the in-app AI panel (`src/app/api/ai/route.ts`) needs a user-supplied OpenAI/Anthropic API key or a local Ollama server. It is optional — core authoring, templates, and EPUB/KBP export work without any key.
- **`studio` CLI** (`npm run studio`, `src/studio/`) is the GitHub issue/PR agent-orchestration glue, separate from the authoring app.
