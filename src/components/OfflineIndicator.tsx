"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-500/40 bg-[#121A2B]/95 px-4 py-2 text-xs font-medium text-amber-200 shadow-[0_0_16px_rgba(255,138,0,0.25)] backdrop-blur-sm"
    >
      <WifiOff size={14} className="shrink-0 text-amber-400" aria-hidden />
      <span>
        Offline — your books are saved locally. AI features need a connection.
      </span>
    </div>
  );
}
