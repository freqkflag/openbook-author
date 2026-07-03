"use client";

import { createContext, useContext } from "react";

type AssetSelectHandler = (src: string, alt?: string) => void;

interface EditorAssetContextValue {
  openAssetPicker: (onSelect: AssetSelectHandler, title?: string) => void;
}

export const EditorAssetContext = createContext<EditorAssetContextValue | null>(null);

export function useEditorAssetContext(): EditorAssetContextValue | null {
  return useContext(EditorAssetContext);
}
