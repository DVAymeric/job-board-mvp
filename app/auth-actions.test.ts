import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser, deleteAccount } from "@/app/auth-actions";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// registerUser doesn't call signIn; loginAction/registerAction (which do)
// are exercised live via the browser, not unit-tested here — importing the
// real next-auth chain isn't needed and doesn't resolve under Vitest.
vi.mock("@/auth", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  UNAUTHENTICATED_ERROR: "Vous devez être connecté pour effectuer cette action.",
}));

describe("registerUser", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
  });

  it("rejects an invalid email", async () => {
    const result = await registerUser({
      email: "not-an-email",
      password: "correct horse battery staple",
    });
    expect(result).toEqual({
      ok: false,
      error: expect.any(String),
      code: "VALIDATION_ERROR",
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects a password under 8 characters", async () => {
    const result = await registerUser({
      email: "jane@example.com",
      password: "short",
    });
    expect(result).toEqual({
      ok: false,
      error: expect.any(String),
      code: "VALIDATION_ERROR",
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects an email that's already registered", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
      passwordHash: "x",
      name: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await registerUser({
      email: "jane@example.com",
      password: "correct horse battery staple",
    });

    expect(result).toEqual({
      ok: false,
      error: "Un compte existe déjà avec cet email",
      code: "CONFLICT",
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("normalizes the email and creates the user with a hashed password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
      passwordHash: "irrelevant",
      name: "Jane",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await registerUser({
      email: "  Jane@Example.com  ",
      password: "correct horse battery staple",
      name: "Jane",
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "jane@example.com" },
    });

    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.email).toBe("jane@example.com");
    expect(createCall.data.name).toBe("Jane");
    expect(
      verifyPassword("correct horse battery staple", createCall.data.passwordHash as string)
    ).toBe(true);
  });
});

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.user.delete).mockReset();
    vi.mocked(signOut).mockReset();
  });

  it("rejects an unauthenticated caller without touching the database", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false,
      error: "Vous devez être connecté pour effectuer cette action.",
      code: "UNAUTHENTICATED",
    });

    const result = await deleteAccount();

    expect(result).toEqual({
      ok: false,
      error: "Vous devez être connecté pour effectuer cette action.",
      code: "UNAUTHENTICATED",
    });
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("deletes the authenticated user's account and signs them out", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "jane@example.com", name: null },
    });
    vi.mocked(prisma.user.delete).mockResolvedValue({} as never);

    const result = await deleteAccount();

    expect(result).toEqual({ ok: true });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
  });

  it("reports an error and does not sign out when the deletion fails", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "jane@example.com", name: null },
    });
    vi.mocked(prisma.user.delete).mockRejectedValue(new Error("db down"));

    const result = await deleteAccount();

    expect(result).toEqual({
      ok: false,
      error: "Impossible de supprimer le compte",
      code: "INTERNAL_ERROR",
    });
    expect(signOut).not.toHaveBeenCalled();
  });
});
