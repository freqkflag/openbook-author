"use client";

import { useCallback, useEffect, useState } from "react";
import { GitBranch, GitCommit, Loader2, RefreshCw } from "lucide-react";
import type { GitStatusResult } from "@/types/electron.d";

interface GitPanelProps {
  projectPath?: string;
}

export default function GitPanel({ projectPath }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastCommit, setLastCommit] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectPath || !window.openBook?.gitStatus) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.openBook.gitStatus(projectPath);
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Git status failed");
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!window.openBook?.isElectron) {
    return (
      <p className="text-xs text-slate-500">
        Git panel is available in the Electron desktop app for folder projects.
      </p>
    );
  }

  if (!projectPath) {
    return (
      <p className="text-xs text-slate-500">
        Save as a folder project to enable git-friendly diffs and version control.
      </p>
    );
  }

  const handleInit = async () => {
    if (!window.openBook?.gitInit) return;
    setLoading(true);
    setError(null);
    try {
      await window.openBook.gitInit(projectPath);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Git init failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!window.openBook?.gitCommit || !commitMessage.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.openBook.gitCommit(projectPath, commitMessage.trim());
      setLastCommit(result.oid.slice(0, 7));
      setCommitMessage("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <GitBranch size={14} />
          Git
        </h3>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-white/5 disabled:opacity-50"
          title="Refresh git status"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      <p className="text-xs text-slate-500 truncate" title={projectPath}>
        {projectPath}
      </p>

      {error && (
        <p className="text-xs text-red-400 border border-red-500/30 rounded-lg px-2 py-1.5">{error}</p>
      )}

      {!status?.isRepo ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">No git repository detected in this folder.</p>
          <button
            type="button"
            onClick={() => void handleInit()}
            disabled={loading}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            Initialize Git Repository
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Branch</span>
            <span className="text-white font-mono">{status.branch || "main"}</span>
            {status.clean ? (
              <span className="text-green-400/90">Clean</span>
            ) : (
              <span className="text-amber-400/90">{status.entries.length} change(s)</span>
            )}
          </div>

          {status.entries.length > 0 && (
            <ul className="max-h-32 overflow-y-auto text-xs space-y-1 border border-white/10 rounded-lg p-2 bg-[#0B1020]/60">
              {status.entries.map((entry) => (
                <li key={entry.path} className="flex justify-between gap-2 text-slate-300">
                  <span className="truncate font-mono">{entry.path}</span>
                  <span className="shrink-0 text-cyan-400/80 capitalize">{entry.status}</span>
                </li>
              ))}
            </ul>
          )}

          <label className="block text-xs text-slate-400">
            Commit message
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Chapter 3 draft"
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/40 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleCommit()}
            disabled={loading || !commitMessage.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 text-cyan-200 hover:from-cyan-500/30 hover:to-fuchsia-500/30 disabled:opacity-50"
          >
            <GitCommit size={14} />
            Commit Changes
          </button>
          {lastCommit && (
            <p className="text-xs text-green-400/90">Committed {lastCommit}</p>
          )}
        </>
      )}
    </div>
  );
}
