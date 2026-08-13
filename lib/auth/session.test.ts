import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { auth } from "@/auth";
import { getCurrentUser, requireUser, UNAUTHENTICATED_ERROR } from "@/lib/auth/session";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const mockAuth = auth as unknown as Mock;

describe("getCurrentUser", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null when the session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" });
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the current user when a session exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "jane@example.com", name: "Jane" },
      expires: "",
    });

    expect(await getCurrentUser()).toEqual({
      id: "user-1",
      email: "jane@example.com",
      name: "Jane",
    });
  });
});

describe("requireUser", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("returns ok:false with a French error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await requireUser()).toEqual({ ok: false, error: UNAUTHENTICATED_ERROR });
  });

  it("returns ok:true with the user when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "jane@example.com", name: "Jane" },
      expires: "",
    });

    expect(await requireUser()).toEqual({
      ok: true,
      user: { id: "user-1", email: "jane@example.com", name: "Jane" },
    });
  });
});
