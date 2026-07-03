"use client";

import type { ReactNode } from "react";
import OfflineIndicator from "@/components/OfflineIndicator";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <ServiceWorkerRegistration />
      {children}
      <OfflineIndicator />
    </>
  );
}
