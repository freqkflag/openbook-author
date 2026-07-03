"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Wand2,
  ListTree,
  FileText,
  Expand,
  RefreshCw,
  Send,
  Loader2,
  X,
  Settings,
  FilePlus2,
  ShieldCheck,
  Wifi,
  WifiOff,
  HardDrive,
} from "lucide-react";
import type { AIAction, Book } from "@/types/book";
import {
  buildBookAIContext,
  buildConsistencyCheckContext,
  parseGeneratedSectionHtml,
} from "@/lib/ai-context";
import {
  DEFAULT_OLLAMA_BASE_URL,
  OLLAMA_MODEL_PRESETS,
  resolveOllamaPresetId,
} from "@/lib/ollama";
import { useBookStore } from "@/store/book-store";

interface AIAssistantProps {
  chapterContent: string;
  book: Pick<Book, "metadata" | "chapters">;
  currentChapterId: string;
  onApply: (html: string, mode: "replace" | "append") => void;
  onGenerateSection?: (title: string, content: string) => void;
  onClose: () => void;
}

const ACTIONS: { id: AIAction; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "continue", label: "Continue", icon: <Sparkles size={14} />, description: "Keep writing from here" },
  { id: "improve", label: "Clarity pass", icon: <Wand2 size={14} />, description: "Polish clarity & flow" },
  { id: "expand", label: "Expand", icon: <Expand size={14} />, description: "Add more detail" },
  { id: "rewrite", label: "Rewrite", icon: <RefreshCw size={14} />, description: "Fresh take, same meaning" },
  { id: "summarize", label: "Summarize", icon: <FileText size={14} />, description: "Condense content" },
  { id: "outline", label: "Outline", icon: <ListTree size={14} />, description: "Structured chapter outline (JSON)" },
  {
    id: "consistency-check",
    label: "Consistency",
    icon: <ShieldCheck size={14} />,
    description: "Check tone, facts & continuity",
  },
  {
    id: "generate-section",
    label: "Generate section",
    icon: <FilePlus2 size={14} />,
    description: "Create a new section from a prompt",
  },
];

type OllamaHealth = "checking" | "online" | "offline";

function OllamaStatusBadge({
  health,
  modelCount,
}: {
  health: OllamaHealth;
  modelCount?: number;
}) {
  if (health === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
        <Loader2 size={10} className="animate-spin" />
        Checking Ollama…
      </span>
    );
  }

  if (health === "online") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        <HardDrive size={10} />
        <Wifi size={10} />
        Local · Online
        {modelCount !== undefined && modelCount > 0 && (
          <span className="text-emerald-400/70">({modelCount} models)</span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
      <HardDrive size={10} />
      <WifiOff size={10} />
      Local · Offline
    </span>
  );
}

export default function AIAssistant({
  chapterContent,
  book,
  currentChapterId,
  onApply,
  onGenerateSection,
  onClose,
}: AIAssistantProps) {
  const { aiSettings } = useBookStore();
  const [action, setAction] = useState<AIAction>("continue");
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(aiSettings);
  const [ollamaPreset, setOllamaPreset] = useState(() => resolveOllamaPresetId(aiSettings.model));
  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth>("checking");
  const [ollamaModelCount, setOllamaModelCount] = useState<number | undefined>();
  const updateAISettings = useBookStore((s) => s.updateAISettings);

  const isElectron = typeof window !== "undefined" && !!window.openBook?.isElectron;
  const isConsistencyCheck = action === "consistency-check";
  const isGenerateSection = action === "generate-section";

  const bookContext = buildBookAIContext(book, currentChapterId);

  const checkOllama = useCallback(async (baseUrl?: string) => {
    setOllamaHealth("checking");
    try {
      const params = new URLSearchParams();
      const url = baseUrl?.trim() || DEFAULT_OLLAMA_BASE_URL;
      params.set("baseUrl", url);
      const res = await fetch(`/api/ai/ollama-health?${params.toString()}`);
      const data = (await res.json()) as { reachable: boolean; models?: string[] };
      if (data.reachable) {
        setOllamaHealth("online");
        setOllamaModelCount(data.models?.length ?? 0);
      } else {
        setOllamaHealth("offline");
        setOllamaModelCount(undefined);
      }
    } catch {
      setOllamaHealth("offline");
      setOllamaModelCount(undefined);
    }
  }, []);

  useEffect(() => {
    if (localSettings.provider === "ollama") {
      void checkOllama(localSettings.baseUrl);
    }
  }, [localSettings.provider, localSettings.baseUrl, checkOllama]);

  useEffect(() => {
    if (aiSettings.provider === "ollama" && !showSettings) {
      void checkOllama(aiSettings.baseUrl);
    }
  }, [aiSettings.provider, aiSettings.baseUrl, showSettings, checkOllama]);

  const runAI = async () => {
    setLoading(true);
    setError("");
    setResult("");
    try {
      let context = bookContext;
      let content = chapterContent;

      if (isConsistencyCheck) {
        const assembled = await buildConsistencyCheckContext(book, {
          useEmbeddings: isElectron && aiSettings.provider === "ollama",
          ollama:
            aiSettings.provider === "ollama"
              ? {
                  baseUrl: aiSettings.baseUrl || DEFAULT_OLLAMA_BASE_URL,
                  model: "nomic-embed-text",
                }
              : undefined,
        });
        context = `${assembled.context}\n\nRetrieval: ${assembled.scopeNote} (${assembled.chunksUsed} chunks from ${assembled.chaptersScanned} sections)`;
        content = assembled.manuscript;
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          content,
          context,
          customPrompt:
            action === "custom" || action === "generate-section" ? customPrompt : undefined,
          voiceProfile: aiSettings.voiceProfile,
          styleGuide: aiSettings.styleGuide,
          ...aiSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = () => {
    updateAISettings(localSettings);
    setShowSettings(false);
  };

  const handleProviderChange = (provider: typeof localSettings.provider) => {
    setLocalSettings({ ...localSettings, provider });
    if (provider === "ollama") {
      setOllamaPreset(resolveOllamaPresetId(localSettings.model));
    }
  };

  const handleOllamaPresetChange = (presetId: string) => {
    setOllamaPreset(presetId);
    if (presetId !== "custom") {
      setLocalSettings({ ...localSettings, model: presetId });
    }
  };

  const isOllama = localSettings.provider === "ollama";
  const showOllamaBadge = isOllama || (aiSettings.provider === "ollama" && !showSettings);

  return (
    <div className="flex flex-col h-full bg-[#121A2B]/90 backdrop-blur-xl border-l border-fuchsia-500/20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-fuchsia-400" size={18} />
          <h2 className="font-semibold text-sm text-white">AI Assistant</h2>
          {showOllamaBadge && (
            <OllamaStatusBadge
              health={ollamaHealth}
              modelCount={ollamaModelCount}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setLocalSettings(aiSettings);
              setOllamaPreset(resolveOllamaPresetId(aiSettings.model));
              setShowSettings(!showSettings);
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-white/5"
            title="AI Settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider">AI Configuration</h3>
          <label className="block text-xs text-slate-400">
            Provider
            <select
              value={localSettings.provider}
              onChange={(e) =>
                handleProviderChange(e.target.value as typeof localSettings.provider)
              }
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </label>

          {isOllama && (
            <div className="flex items-center justify-between gap-2">
              <OllamaStatusBadge health={ollamaHealth} modelCount={ollamaModelCount} />
              <button
                type="button"
                onClick={() => void checkOllama(localSettings.baseUrl)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
              >
                Recheck
              </button>
            </div>
          )}

          {localSettings.provider !== "ollama" && (
            <label className="block text-xs text-slate-400">
              API Key
              <input
                type="password"
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                placeholder="sk-..."
                className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
          )}

          {isOllama ? (
            <>
              <label className="block text-xs text-slate-400">
                Model preset
                <select
                  value={ollamaPreset}
                  onChange={(e) => handleOllamaPresetChange(e.target.value)}
                  className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {OLLAMA_MODEL_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label} — {preset.description}
                    </option>
                  ))}
                  <option value="custom">Custom model name…</option>
                </select>
              </label>
              {ollamaPreset === "custom" && (
                <label className="block text-xs text-slate-400">
                  Custom model
                  <input
                    type="text"
                    value={localSettings.model}
                    onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
                    placeholder="e.g. my-fine-tuned-model"
                    className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </label>
              )}
            </>
          ) : (
            <label className="block text-xs text-slate-400">
              Model
              <input
                type="text"
                value={localSettings.model}
                onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
                placeholder={
                  localSettings.provider === "anthropic"
                    ? "claude-3-5-haiku-20241022"
                    : "gpt-4o-mini"
                }
                className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
          )}

          {(localSettings.provider === "ollama" || localSettings.provider === "openai") && (
            <label className="block text-xs text-slate-400">
              Base URL (optional)
              <input
                type="text"
                value={localSettings.baseUrl || ""}
                onChange={(e) => setLocalSettings({ ...localSettings, baseUrl: e.target.value })}
                placeholder={
                  localSettings.provider === "ollama"
                    ? DEFAULT_OLLAMA_BASE_URL
                    : "https://api.openai.com/v1/chat/completions"
                }
                className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
          )}
          <label className="block text-xs text-slate-400">
            Voice profile
            <input
              type="text"
              value={localSettings.voiceProfile || ""}
              onChange={(e) => setLocalSettings({ ...localSettings, voiceProfile: e.target.value })}
              placeholder="e.g. conversational travel guide"
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Style guide
            <textarea
              value={localSettings.styleGuide || ""}
              onChange={(e) => setLocalSettings({ ...localSettings, styleGuide: e.target.value })}
              placeholder="Tone rules, audience, words to avoid…"
              rows={4}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
            />
          </label>
          <button
            onClick={saveSettings}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:from-cyan-500/30 hover:to-fuchsia-500/30 transition-all"
          >
            Save Settings
          </button>
          <p className="text-xs text-slate-500">
            Keys and voice settings are stored locally in your browser. For Ollama, no API key is
            needed — run <code className="text-slate-400">ollama serve</code> and pull a model preset.
          </p>
        </div>
      ) : (
        <>
          <div className="p-3 grid grid-cols-2 gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAction(a.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                  action === a.id
                    ? "bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300"
                    : "bg-white/5 border border-transparent text-slate-400 hover:bg-white/10"
                }`}
                title={a.description}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>

          {isConsistencyCheck && (
            <div className="mx-3 mb-2 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-slate-400 leading-relaxed">
              <p className="text-cyan-300/90 font-medium mb-1">Scope limits</p>
              <p>
                Scans sampled excerpts across all sections — not every sentence. Browser mode uses
                keyword retrieval; Electron + Ollama can use local embeddings. Ollama keeps analysis
                fully private. Not a substitute for human proofreading.
              </p>
            </div>
          )}

          <div className="px-3 pb-2">
            {!isConsistencyCheck && (
              <textarea
                value={customPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  if (e.target.value && action !== "generate-section") setAction("custom");
                }}
                placeholder={
                  isGenerateSection
                    ? "Describe the new section to generate…"
                    : "Or type a custom instruction…"
                }
                rows={2}
                className="w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 resize-none"
              />
            )}
          </div>

          <div className="px-3">
            <button
              onClick={runAI}
              disabled={loading || (isGenerateSection && !customPrompt.trim())}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-medium hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading
                ? isConsistencyCheck
                  ? "Scanning book…"
                  : "Thinking..."
                : isConsistencyCheck
                  ? "Run consistency check"
                  : isGenerateSection
                    ? "Generate section"
                    : "Generate"}
            </button>
          </div>

          {error && (
            <div className="mx-3 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}

          {result && (
            <div className="flex-1 flex flex-col mx-3 mt-3 mb-3 min-h-0">
              <div
                className="flex-1 overflow-y-auto p-3 rounded-lg bg-[#0B1020] border border-white/10 text-sm text-slate-300 prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: result }}
              />
              {isGenerateSection && onGenerateSection ? (
                <button
                  onClick={() => {
                    const { title, content } = parseGeneratedSectionHtml(result);
                    onGenerateSection(title, content);
                  }}
                  className="mt-2 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30"
                >
                  Add as new section
                </button>
              ) : isConsistencyCheck ? (
                <p className="mt-2 text-[11px] text-slate-500 text-center">
                  Review findings and edit sections manually as needed.
                </p>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onApply(result, "append")}
                    className="flex-1 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30"
                  >
                    Append
                  </button>
                  <button
                    onClick={() => onApply(result, "replace")}
                    className="flex-1 py-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-medium hover:bg-fuchsia-500/30"
                  >
                    Replace
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
