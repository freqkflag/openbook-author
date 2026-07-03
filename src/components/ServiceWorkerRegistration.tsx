"use client";

import { useEffect } from "react";
import { SERVICE_WORKER_PATH, shouldRegisterServiceWorker } from "@/lib/pwa";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    const isElectron = window.openBook?.isElectron ?? false;
    if (!shouldRegisterServiceWorker(isElectron, "serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch((err) => {
      console.warn("[PWA] Service worker registration failed:", err);
    });
  }, []);

  return null;
}
