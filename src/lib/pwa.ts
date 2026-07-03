/** Cache bucket version — bump when shell caching strategy changes. */
export const PWA_CACHE_VERSION = "openbook-author-v1";

/** Service worker script path (served from /public). */
export const SERVICE_WORKER_PATH = "/sw.js";

/**
 * Web builds register a service worker; Electron serves the app locally and
 * does not need offline shell caching.
 */
export function shouldRegisterServiceWorker(
  isElectron: boolean,
  hasServiceWorker: boolean
): boolean {
  return !isElectron && hasServiceWorker;
}
