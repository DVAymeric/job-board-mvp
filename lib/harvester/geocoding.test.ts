import { describe, it, expect, vi, beforeEach } from "vitest";
import { geocodeCity, resolveLocations } from "@/lib/harvester/geocoding";
import { safeFetch } from "@/lib/safe-fetch";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

function featureCollection(features: unknown[]) {
  return new Response(JSON.stringify({ features }), { status: 200 });
}

beforeEach(() => {
  vi.mocked(safeFetch).mockReset();
});

describe("geocodeCity", () => {
  it("returns the label and coordinates of the first match", async () => {
    vi.mocked(safeFetch).mockResolvedValue(
      featureCollection([
        { geometry: { coordinates: [3.045391, 50.630951] }, properties: { label: "Lille" } },
      ])
    );

    const result = await geocodeCity("Lille");

    expect(result).toEqual({ label: "Lille", lat: 50.630951, lng: 3.045391 });
  });

  it("queries the BAN municipality search with the given city name", async () => {
    vi.mocked(safeFetch).mockResolvedValue(featureCollection([]));

    await geocodeCity("Lille 59000");

    const [url] = vi.mocked(safeFetch).mock.calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get("q")).toBe("Lille 59000");
    expect(parsed.searchParams.get("type")).toBe("municipality");
  });

  it("returns null when no city matches", async () => {
    vi.mocked(safeFetch).mockResolvedValue(featureCollection([]));

    const result = await geocodeCity("Villeinexistante");

    expect(result).toBeNull();
  });

  it("returns null when the request fails", async () => {
    vi.mocked(safeFetch).mockResolvedValue(new Response("error", { status: 500 }));

    const result = await geocodeCity("Lille");

    expect(result).toBeNull();
  });

  it("returns null when safeFetch blocks the request", async () => {
    vi.mocked(safeFetch).mockResolvedValue(null);

    const result = await geocodeCity("Lille");

    expect(result).toBeNull();
  });
});

describe("resolveLocations", () => {
  it("resolves every input location, attaching the radius to each geocoded city", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(
        featureCollection([{ geometry: { coordinates: [3.045391, 50.630951] }, properties: { label: "Lille" } }])
      )
      .mockResolvedValueOnce(
        featureCollection([{ geometry: { coordinates: [2.3522, 48.8566] }, properties: { label: "Paris" } }])
      );

    const result = await resolveLocations([
      { label: "Lille", radiusKm: 30 },
      { label: "Paris", radiusKm: 10 },
    ]);

    expect(result).toEqual({
      ok: true,
      locations: [
        { label: "Lille", lat: 50.630951, lng: 3.045391, radiusKm: 30 },
        { label: "Paris", lat: 48.8566, lng: 2.3522, radiusKm: 10 },
      ],
    });
  });

  it("reports the unresolved label and stops calling the geocoder once a city can't be found", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(
        featureCollection([{ geometry: { coordinates: [3.045391, 50.630951] }, properties: { label: "Lille" } }])
      )
      .mockResolvedValueOnce(featureCollection([]));

    const result = await resolveLocations([
      { label: "Lille", radiusKm: 30 },
      { label: "Villeinexistante", radiusKm: 10 },
      { label: "Paris", radiusKm: 10 },
    ]);

    expect(result).toEqual({ ok: false, unresolvedLabel: "Villeinexistante" });
    expect(safeFetch).toHaveBeenCalledTimes(2);
  });
});
