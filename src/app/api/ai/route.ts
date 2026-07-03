import { NextRequest, NextResponse } from "next/server";
import type { AIAction } from "@/types/book";

const PROMPTS: Record<AIAction, string> = {
  continue:
    "Continue writing naturally from where the text left off. Match the tone and style. Return only the continuation as HTML paragraphs.",
  improve:
    "Improve the writing for clarity, flow, and engagement. Return the improved version as HTML, preserving structure.",
  outline:
    "Generate a detailed chapter outline for this book topic. Return as HTML with h2 for sections and ul/li for bullet points.",
  summarize:
    "Summarize the following content concisely. Return as HTML with a brief summary paragraph.",
  expand:
    "Expand this content with more detail, examples, and depth. Return as HTML paragraphs.",
  rewrite:
    "Rewrite this content in a fresh voice while keeping the same meaning. Return as HTML.",
  custom: "",
};

interface AIRequestBody {
  action: AIAction;
  content: string;
  context?: string;
  customPrompt?: string;
  provider: "openai" | "anthropic" | "ollama";
  apiKey: string;
  model: string;
  baseUrl?: string;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  baseUrl?: string
): Promise<string> {
  const url = baseUrl || "https://api.openai.com/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
    }),
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
  user: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "llama3.2",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: false,
    }),
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
    const { action, content, context, customPrompt, provider, apiKey, model, baseUrl } = body;

    if (provider !== "ollama" && !apiKey) {
      return NextResponse.json(
        { error: "API key required. Configure it in AI Settings." },
        { status: 400 }
      );
    }

    const instruction = action === "custom" ? customPrompt : PROMPTS[action];
    if (!instruction) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const system = `You are a professional book writing assistant for OpenBook Author, a FOSS iBooks Author alternative. 
Always respond with clean HTML suitable for a rich text editor (p, h1-h3, ul, ol, li, blockquote, strong, em).
Do not wrap in markdown code blocks. Do not include explanatory preamble.`;

    const user = context
      ? `Book context: ${context}\n\nContent:\n${content}\n\nTask: ${instruction}`
      : `Content:\n${content}\n\nTask: ${instruction}`;

    let result: string;
    switch (provider) {
      case "anthropic":
        result = await callAnthropic(apiKey, model, system, user);
        break;
      case "ollama":
        result = await callOllama(baseUrl || "http://localhost:11434", model, system, user);
        break;
      default:
        result = await callOpenAI(apiKey, model, system, user, baseUrl || undefined);
    }

    result = result.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
