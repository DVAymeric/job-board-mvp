import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/app/auth-actions";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// registerUser doesn't call signIn; loginAction/registerAction (which do)
// are exercised live via the browser, not unit-tested here — importing the
// real next-auth chain isn't needed and doesn't resolve under Vitest.
vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
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
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects a password under 8 characters", async () => {
    const result = await registerUser({
      email: "jane@example.com",
      password: "short",
    });
    expect(result).toEqual({ ok: false, error: expect.any(String) });
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
