import { describe, expect, it, vi } from "vitest";
import { probeTalentsoft } from "@/lib/harvester/discovery/probe-talentsoft";

function allowAllRobots(): Response {
  return new Response("User-agent: *\nAllow: /", { status: 200 });
}

describe("probeTalentsoft", () => {
  it("returns the first candidate domain whose page looks like Talentsoft", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      if (url === "https://recrutement.acme-tsft-a.fr/") return new Response("nope", { status: 404 });
      if (url === "https://acme-tsft-a-recrute.talent-soft.com/") {
        return new Response("<html>__VIEWSTATE=abc</html>", { status: 200 });
      }
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-a", fetchImpl)).toBe("acme-tsft-a-recrute.talent-soft.com");
  });

  it("returns undefined when no candidate domain matches", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-b", fetchImpl)).toBeUndefined();
  });

  it("skips a candidate domain disallowed by robots.txt without fetching its page", async () => {
    const pageFetches: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === "https://recrutement.acme-tsft-c.fr/robots.txt") {
        return new Response("User-agent: *\nDisallow: /", { status: 200 });
      }
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      pageFetches.push(url);
      if (url === "https://acme-tsft-c-recrute.talent-soft.com/") {
        return new Response("<html>__VIEWSTATE=abc</html>", { status: 200 });
      }
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-c", fetchImpl)).toBe("acme-tsft-c-recrute.talent-soft.com");
    expect(pageFetches).not.toContain("https://recrutement.acme-tsft-c.fr/");
  });

  it("treats a thrown page fetch as no match for that domain and tries the next", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      if (url === "https://recrutement.acme-tsft-d.fr/") throw new Error("timeout");
      if (url === "https://acme-tsft-d-recrute.talent-soft.com/") {
        return new Response("<html>__VIEWSTATE=abc</html>", { status: 200 });
      }
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-d", fetchImpl)).toBe("acme-tsft-d-recrute.talent-soft.com");
  });
});
