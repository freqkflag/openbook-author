export {};

export interface GitStatusEntry {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
}

export interface GitStatusResult {
  isRepo: boolean;
  branch?: string;
  clean: boolean;
  entries: GitStatusEntry[];
}

export interface GitCommitResult {
  oid: string;
}

interface ElectronPrintOptions {
  preferCSSPageSize?: boolean;
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  footerTemplate?: string;
  marginsType?: number;
  pageSize?: string | { width: number; height: number };
}

export interface FolderWritePayload {
  manifestJson: string;
  bookJson: string;
  projectMetaJson: string;
  assets: { filename: string; data: ArrayBuffer; mimeType: string; assetId: string }[];
}

export interface FolderReadPayload {
  manifestJson: string;
  bookJson: string;
  projectMetaJson?: string;
  assets: { filename: string; data: ArrayBuffer; mimeType: string; assetId: string }[];
  projectPath: string;
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
      openFolderDialog: () => Promise<string | null>;
      createFolderDialog: (defaultName?: string) => Promise<string | null>;
      writeFolderProject: (projectPath: string, payload: FolderWritePayload) => Promise<string>;
      readFolderProject: (projectPath: string) => Promise<FolderReadPayload>;
      gitStatus: (projectPath: string) => Promise<GitStatusResult>;
      gitInit: (projectPath: string) => Promise<void>;
      gitCommit: (projectPath: string, message: string) => Promise<GitCommitResult>;
      backupGetConfig: () => Promise<import("@/lib/backup-sync/types").BackupSyncConfig | null>;
      backupSetConfig: (config: import("@/lib/backup-sync/types").BackupSyncConfig | null) => Promise<void>;
      backupUpload: (payload: {
        bookId: string;
        slug: string;
        buffer: ArrayBuffer;
        updatedAt: string;
      }) => Promise<{ remotePath: string; syncedAt: string }>;
      printToPdf: (
        html: string,
        defaultName?: string,
        printOptions?: ElectronPrintOptions
      ) => Promise<string | null>;
      onMenuOpen: (cb: () => void) => () => void;
      onMenuSave: (cb: () => void) => () => void;
      onMenuSaveAs: (cb: () => void) => () => void;
      onMenuOpenFolder: (cb: () => void) => () => void;
    };
  }
}
