# AI Consistency Check — Local-First RAG

OpenBook Author includes a **Consistency check** action in the AI Assistant panel. It scans your book for likely contradictions in character names, timeline, and stated facts.

## Privacy and local-first

| Mode | Retrieval | LLM | Data leaves device? |
|------|-----------|-----|---------------------|
| **Ollama (recommended)** | Keyword RAG in browser; optional Ollama embeddings in Electron | Local Ollama | No — manuscript stays on your machine |
| **OpenAI / Anthropic** | Keyword RAG only | Cloud API | Yes — sampled excerpts are sent to the provider |

- AI settings (API keys, voice profile) are stored in **localStorage** only.
- Consistency check never uploads your full manuscript — it sends **sampled excerpts** (retrieved chunks + short per-chapter snippets), capped at ~10k characters.
- For maximum privacy, use **Ollama** as the provider with a local model (e.g. `llama3.2`). In the Electron app with Ollama, semantic retrieval via `nomic-embed-text` (or another embedding model you have pulled) improves recall without cloud dependencies.

## How it works

1. **Chunk index** — Each section’s HTML is stripped and split into overlapping text chunks.
2. **Retrieval**
   - **Browser / all modes:** TF–IDF-style keyword retrieval over chunks, biased toward names, dates, locations, and numeric facts.
   - **Electron + Ollama:** Optionally embeds chunks via Ollama’s `/api/embeddings` endpoint for semantic similarity. Falls back to keyword retrieval if embeddings are unavailable.
3. **Context assembly** — Book metadata, table of contents, retrieved passages, and per-chapter snippets are assembled in `buildConsistencyCheckContext` (`src/lib/ai-context.ts`).
4. **LLM pass** — The `/api/ai` route asks the model to report character name drift, timeline issues, and fact contradictions as structured HTML.

## Scope limits

The consistency check is a **writing aid**, not proofreading software:

- It samples excerpts; it does **not** read every sentence.
- Large books are truncated to fit model context windows.
- False positives and missed issues are expected — always verify findings manually.
- Cloud providers receive only the sampled payload you trigger; use Ollama for fully offline workflows.

## Related code

- `src/lib/ai-rag.ts` — chunking and retrieval
- `src/lib/ai-context.ts` — `buildConsistencyCheckContext`
- `src/components/AIAssistant.tsx` — UI action and scope notice
- `src/app/api/ai/route.ts` — consistency-check prompt

## Wave B

Shipped as Wave B item 4 — AI RAG + consistency agent (local chapter embeddings / keyword RAG, Ollama-friendly).
