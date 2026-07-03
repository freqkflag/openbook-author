import { NextRequest, NextResponse } from "next/server";
import type { AIAction } from "@/types/book";
import {
  CONSISTENCY_CHECK_JSON_SCHEMA,
  OUTLINE_JSON_SCHEMA,
  isStructuredJsonAction,
  structuredJsonToHtml,
} from "@/lib/ollama";

const PROMPTS: Record<AIAction, string> = {
  continue:
    "Continue writing naturally from where the text left off. Match the tone and style. Return only the continuation as HTML paragraphs.",
  improve:
    "Improve the writing for clarity, flow, and engagement. Return the improved version as HTML, preserving structure.",
  outline:
    "Generate a detailed chapter outline for this book topic. Return valid JSON matching the provided schema.",
  "consistency-check":
    "Review the book content for consistency issues: character names and traits, timeline continuity, factual claims, and tone alignment with the voice profile. Return valid JSON matching the provided schema.",
  summarize:
    "Summarize the following content concisely. Return as HTML with a brief summary paragraph.",
  expand:
    "Expand this content with more detail, examples, and depth. Return as HTML paragraphs.",
  rewrite:
    "Rewrite this content in a fresh voice while keeping the same meaning. Return as HTML.",
  "generate-section":
    "Generate a complete new book section based on the author's instruction and book context. Start with a single h1 for the section title, then body content as HTML (p, h2, ul, blockquote as needed). Return only the section HTML.",
  custom: "",
};

interface AIRequestBody {
  action: AIAction;
  content: string;
  context?: string;
  customPrompt?: string;
  voiceProfile?: string;
  styleGuide?: string;
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function buildSystemPrompt(
  voiceProfile?: string,
  styleGuide?: string,
  action?: AIAction
): string {
  const structured = action && isStructuredJsonAction(action);

  let system = structured
    ? `You are a professional book writing assistant for OpenBook Author.
Respond with valid JSON only — no markdown fences, no preamble, no HTML.
Follow the JSON schema exactly.`
    : `You are a professional book writing assistant for OpenBook Author, a FOSS iBooks Author alternative. 
Always respond with clean HTML suitable for a rich text editor (p, h1-h3, ul, ol, li, blockquote, strong, em).
Do not wrap in markdown code blocks. Do not include explanatory preamble.`;

  if (voiceProfile?.trim()) {
    system += `\n\nVoice profile: ${voiceProfile.trim()}`;
  }
  if (styleGuide?.trim()) {
    system += `\n\nStyle guide:\n${styleGuide.trim()}`;
  }

  if (action === "outline") {
    system += `\n\nJSON schema:\n${JSON.stringify(OUTLINE_JSON_SCHEMA, null, 2)}`;
  }
  if (action === "consistency-check") {
    system += `\n\nJSON schema:\n${JSON.stringify(CONSISTENCY_CHECK_JSON_SCHEMA, null, 2)}`;
    system +=
      "\n\nWork only from the provided manuscript excerpts. Do not invent plot details. Cite section titles in issue descriptions.";
  }

  return system;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  baseUrl?: string,
  jsonMode?: boolean
): Promise<string> {
  const url = baseUrl || "https://api.openai.com/v1/chat/completions";
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOllama(
  baseUrl: string,
  model: string,
  system: string,
  user: string,
  jsonMode?: boolean
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;
  const body: Record<string, unknown> = {
    model: model || "llama3.2",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    stream: false,
  };
  if (jsonMode) {
    body.format = "json";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AIRequestBody;
    const {
      action,
      content,
      context,
      customPrompt,
      voiceProfile,
      styleGuide,
      provider,
      apiKey,
      model,
      baseUrl,
    } = body;

    if (provider !== "ollama" && !apiKey) {
      return NextResponse.json(
        { error: "API key required. Configure it in AI Settings." },
        { status: 400 }
      );
    }

    const instruction =
      action === "custom"
        ? customPrompt
        : action === "generate-section" && customPrompt?.trim()
          ? `${PROMPTS["generate-section"]}\n\nAuthor request: ${customPrompt.trim()}`
          : PROMPTS[action];
    if (!instruction) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const structured = isStructuredJsonAction(action);
    const system = buildSystemPrompt(voiceProfile, styleGuide, action);

    const user =
      action === "consistency-check"
        ? context
          ? `Book context:\n${context}\n\nManuscript excerpts:\n${content}\n\nTask: ${instruction}`
          : `Manuscript excerpts:\n${content}\n\nTask: ${instruction}`
        : context
          ? `Book context: ${context}\n\nContent:\n${content}\n\nTask: ${instruction}`
          : `Content:\n${content}\n\nTask: ${instruction}`;

    let result: string;
    switch (provider) {
      case "anthropic":
        result = await callAnthropic(apiKey, model, system, user);
        break;
      case "ollama":
        result = await callOllama(
          baseUrl || "http://localhost:11434",
          model,
          system,
          user,
          structured
        );
        break;
      default:
        result = await callOpenAI(apiKey, model, system, user, baseUrl || undefined, structured);
    }

    if (structured) {
      try {
        result = structuredJsonToHtml(action, result);
      } catch {
        return NextResponse.json(
          { error: "AI returned invalid JSON for structured action. Try again or switch models." },
          { status: 422 }
        );
      }
    } else {
      result = result.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    return NextResponse.json({ result, structured: structured || undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
