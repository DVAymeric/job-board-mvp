import { describe, expect, it, vi, beforeEach } from "vitest";
import { importBackupJson } from "@/app/actions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MAX_BACKUP_FILE_SIZE_BYTES } from "@/lib/backup";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("importBackupJson — taille max du fichier (JOB-90)", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.$transaction).mockReset();
    vi.mocked(requireUser).mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "user-1@example.com", name: null },
    });
  });

  it("rejects an oversized payload before attempting to parse it, with a clear message", async () => {
    const oversized = "a".repeat(MAX_BACKUP_FILE_SIZE_BYTES + 1);

    const result = await importBackupJson(oversized);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/volumineux/i);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("still processes a payload right at the size limit", async () => {
    const validJson = JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      tags: [],
      jobs: [],
    });
    // Pad with whitespace up to (but not over) the limit — still valid JSON.
    const padded =
      validJson.slice(0, -1) +
      " ".repeat(MAX_BACKUP_FILE_SIZE_BYTES - validJson.length) +
      validJson.slice(-1);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    const result = await importBackupJson(padded);

    expect(result).toEqual({ ok: true, data: { importedJobs: 0 } });
  });
});
