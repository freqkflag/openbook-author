import { describe, expect, it } from "vitest";
import { buildBackupRemotePath } from "@/lib/backup-sync/index";

describe("backup-sync", () => {
  it("builds timestamped remote paths with book id", () => {
    const path = buildBackupRemotePath(
      "openbook-backups",
      "550e8400-e29b-41d4-a716-446655440000",
      "My Book",
      "2026-07-03T12:34:56.789Z"
    );
    expect(path).toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(path).toContain("my-book.openbook");
    expect(path.startsWith("openbook-backups/")).toBe(true);
  });
});
