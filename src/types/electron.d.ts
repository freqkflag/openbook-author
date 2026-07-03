export {};

declare global {
  interface Window {
    openBook?: {
      platform: string;
      isElectron: boolean;
    };
  }
}
