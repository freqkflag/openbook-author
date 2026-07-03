"use client";

import { useState } from "react";
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
} from "lucide-react";
import type { AIAction } from "@/types/book";
import { useBookStore } from "@/store/book-store";

interface AIAssistantProps {
  chapterContent: string;
  bookTitle: string;
  onApply: (html: string, mode: "replace" | "append") => void;
  onClose: () => void;
}

const ACTIONS: { id: AIAction; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "continue", label: "Continue", icon: <Sparkles size={14} />, description: "Keep writing from here" },
  { id: "improve", label: "Improve", icon: <Wand2 size={14} />, description: "Polish clarity & flow" },
  { id: "expand", label: "Expand", icon: <Expand size={14} />, description: "Add more detail" },
  { id: "rewrite", label: "Rewrite", icon: <RefreshCw size={14} />, description: "Fresh take, same meaning" },
  { id: "summarize", label: "Summarize", icon: <FileText size={14} />, description: "Condense content" },
  { id: "outline", label: "Outline", icon: <ListTree size={14} />, description: "Generate chapter structure" },
];

export default function AIAssistant({ chapterContent, bookTitle, onApply, onClose }: AIAssistantProps) {
  const { aiSettings } = useBookStore();
  const [action, setAction] = useState<AIAction>("continue");
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(aiSettings);
  const updateAISettings = useBookStore((s) => s.updateAISettings);

  const runAI = async () => {
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          content: chapterContent,
          context: `Book title: ${bookTitle}`,
          customPrompt: action === "custom" ? customPrompt : undefined,
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

  return (
    <div className="flex flex-col h-full bg-[#121A2B]/90 backdrop-blur-xl border-l border-fuchsia-500/20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-fuchsia-400" size={18} />
          <h2 className="font-semibold text-sm text-white">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
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
                setLocalSettings({
                  ...localSettings,
                  provider: e.target.value as typeof localSettings.provider,
                })
              }
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </label>
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
          <label className="block text-xs text-slate-400">
            Model
            <input
              type="text"
              value={localSettings.model}
              onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
              placeholder={
                localSettings.provider === "anthropic"
                  ? "claude-3-5-haiku-20241022"
                  : localSettings.provider === "ollama"
                    ? "llama3.2"
                    : "gpt-4o-mini"
              }
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          {(localSettings.provider === "ollama" || localSettings.provider === "openai") && (
            <label className="block text-xs text-slate-400">
              Base URL (optional)
              <input
                type="text"
                value={localSettings.baseUrl || ""}
                onChange={(e) => setLocalSettings({ ...localSettings, baseUrl: e.target.value })}
                placeholder={
                  localSettings.provider === "ollama"
                    ? "http://localhost:11434"
                    : "https://api.openai.com/v1/chat/completions"
                }
                className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </label>
          )}
          <button
            onClick={saveSettings}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-medium hover:from-cyan-500/30 hover:to-fuchsia-500/30 transition-all"
          >
            Save Settings
          </button>
          <p className="text-xs text-slate-500">
            Keys are stored locally in your browser. For Ollama, no API key is needed.
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

          <div className="px-3 pb-2">
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                if (e.target.value) setAction("custom");
              }}
              placeholder="Or type a custom instruction..."
              rows={2}
              className="w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 resize-none"
            />
          </div>

          <div className="px-3">
            <button
              onClick={runAI}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-medium hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {loading ? "Thinking..." : "Generate"}
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
