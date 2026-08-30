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

  // Bug réel constaté en direct (campagne "Data", villes saisies sans code postal) : la BAN
  // renvoie un `label` municipal sans code postal ("Amiens"), mais fournit `postcode`
  // séparément dans la même réponse ("80000") — jusqu'ici ignoré. France Travail dérive son
  // département en cherchant un code postal à 5 chiffres DANS le label (extractDepartement,
  // query-filter.ts) ; sans lui, la campagne échoue en direct avec "impossible d'extraire un
  // code postal... recherche nationale non bornée refusée" (JOB-64) pour CHAQUE ville saisie
  // via le formulaire (qui ne demande qu'un nom de ville depuis JOB-59).
  it("appends the postcode to the label when the BAN response provides one, so downstream postal-code extraction (France Travail) succeeds", async () => {
    vi.mocked(safeFetch).mockResolvedValue(
      featureCollection([
        { geometry: { coordinates: [2.292605, 49.903041] }, properties: { label: "Amiens", postcode: "80000" } },
      ])
    );

    const result = await geocodeCity("Amiens");

    expect(result).toEqual({ label: "Amiens 80000", lat: 49.903041, lng: 2.292605 });
  });

  it("falls back to the bare label when the BAN response has no postcode", async () => {
    vi.mocked(safeFetch).mockResolvedValue(
      featureCollection([{ geometry: { coordinates: [3.045391, 50.630951] }, properties: { label: "Lille" } }])
    );

    const result = await geocodeCity("Lille");

    expect(result).toEqual({ label: "Lille", lat: 50.630951, lng: 3.045391 });
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
