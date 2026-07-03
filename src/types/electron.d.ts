export {};

declare global {
  interface Window {
    openBook?: {
      platform: string;
      isElectron: boolean;
      saveDialog: (defaultName?: string) => Promise<string | null>;
      openDialog: () => Promise<string | null>;
      writePackage: (filePath: string, buffer: ArrayBuffer) => Promise<string>;
      readPackage: (filePath: string) => Promise<{ buffer: ArrayBuffer; filePath: string }>;
      onMenuOpen: (cb: () => void) => () => void;
      onMenuSave: (cb: () => void) => () => void;
      onMenuSaveAs: (cb: () => void) => () => void;
    };
  }
}
