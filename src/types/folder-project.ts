/** Editor metadata stored alongside folder projects — not included in zip export */
export interface OpenBookProjectMeta {
  version: "1.0";
  storageMode: "folder";
  lastOpenedChapterId?: string;
  gitRemoteHint?: string;
}

export const DEFAULT_PROJECT_META: OpenBookProjectMeta = {
  version: "1.0",
  storageMode: "folder",
};
