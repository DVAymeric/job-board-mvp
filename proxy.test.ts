import { describe, expect, it, vi, beforeEach } from "vitest";
import { proxy } from "@/proxy";

const authHandlerCalls: string[] = [];

vi.mock("@/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (req: unknown) => {
    authHandlerCalls.push((req as { method: string }).method);
    return handler(req);
  },
}));

function makeRequest(method: string, pathname: string) {
  return {
    method,
    auth: null,
    nextUrl: { pathname, origin: "http://localhost:3000" },
  } as never;
}

describe("proxy (JOB-131)", () => {
  beforeEach(() => {
    authHandlerCalls.length = 0;
  });

  it("runs the auth guard for GET requests to a protected route", async () => {
    await proxy(makeRequest("GET", "/board"), {} as never);
    expect(authHandlerCalls).toEqual(["GET"]);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "skips the auth guard entirely for %s requests, so it can never race a Server Action's own cookie mutations (e.g. signOut)",
    async (method) => {
      await proxy(makeRequest(method, "/board"), {} as never);
      expect(authHandlerCalls).toEqual([]);
    }
  );

  it("still runs the auth guard for GET requests to each protected prefix", async () => {
    for (const prefix of ["/board", "/archives", "/analytics", "/account"]) {
      await proxy(makeRequest("GET", prefix), {} as never);
    }
    expect(authHandlerCalls).toEqual(["GET", "GET", "GET", "GET"]);
  });
});
