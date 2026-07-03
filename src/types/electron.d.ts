export {};

interface ElectronPrintOptions {
  preferCSSPageSize?: boolean;
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  footerTemplate?: string;
  marginsType?: number;
  pageSize?: string | { width: number; height: number };
}

declare global {
  interface Window {
    openBook?: {
      platform: string;
      isElectron: boolean;
      saveDialog: (defaultName?: string) => Promise<string | null>;
      openDialog: () => Promise<string | null>;
      writePackage: (filePath: string, buffer: ArrayBuffer) => Promise<string>;
      readPackage: (filePath: string) => Promise<{ buffer: ArrayBuffer; filePath: string }>;
      printToPdf: (
        html: string,
        defaultName?: string,
        printOptions?: ElectronPrintOptions
      ) => Promise<string | null>;
      onMenuOpen: (cb: () => void) => () => void;
      onMenuSave: (cb: () => void) => () => void;
      onMenuSaveAs: (cb: () => void) => () => void;
    };
  }
}
