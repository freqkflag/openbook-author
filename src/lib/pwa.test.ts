import { describe, expect, it } from "vitest";
import {
  PWA_CACHE_VERSION,
  SERVICE_WORKER_PATH,
  shouldRegisterServiceWorker,
} from "./pwa";

describe("pwa", () => {
  it("exports stable cache version and service worker path", () => {
    expect(PWA_CACHE_VERSION).toBe("openbook-author-v1");
    expect(SERVICE_WORKER_PATH).toBe("/sw.js");
  });

  it("registers service worker on web when supported", () => {
    expect(shouldRegisterServiceWorker(false, true)).toBe(true);
  });

  it("skips registration in Electron", () => {
    expect(shouldRegisterServiceWorker(true, true)).toBe(false);
  });

  it("skips registration when service workers are unavailable", () => {
    expect(shouldRegisterServiceWorker(false, false)).toBe(false);
  });
});
