import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenBook Author — FOSS Book Studio",
  description:
    "A modern, free and open-source book authoring app with AI writing assistance. Create and export EPUB books — your alternative to iBooks Author.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#05070D] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
