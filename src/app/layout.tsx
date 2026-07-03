import type { Metadata, Viewport } from "next";
import AppProviders from "@/components/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenBook Author — FOSS Book Studio",
  description:
    "A modern, free and open-source book authoring app with AI writing assistance. Create and export EPUB books — your alternative to iBooks Author.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OpenBook Author",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#05070D] text-slate-200 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
