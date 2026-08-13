import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeCredentials } from "@/lib/auth/authorize";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("authorizeCredentials", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("returns the safe user when the password matches", async () => {
    const passwordHash = hashPassword("correct horse battery staple");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
      passwordHash,
      name: "Jane",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await authorizeCredentials(
      "jane@example.com",
      "correct horse battery staple"
    );

    expect(result).toEqual({ id: "user-1", email: "jane@example.com", name: "Jane" });
  });

  it("normalizes the email (trim + lowercase) before lookup", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await authorizeCredentials("  Jane@Example.com  ", "whatever");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "jane@example.com" },
    });
  });

  it("returns null when no user matches the email", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await authorizeCredentials("nobody@example.com", "whatever");

    expect(result).toBeNull();
  });

  it("returns null when the password doesn't match", async () => {
    const passwordHash = hashPassword("correct horse battery staple");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
      passwordHash,
      name: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await authorizeCredentials("jane@example.com", "wrong password");

    expect(result).toBeNull();
  });

  it.each([
    [undefined, "password"],
    ["email@example.com", undefined],
    ["", "password"],
    ["email@example.com", ""],
    [123, "password"],
  ])("returns null for malformed input (%s, %s) without querying the DB", async (email, password) => {
    const result = await authorizeCredentials(email, password);

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
