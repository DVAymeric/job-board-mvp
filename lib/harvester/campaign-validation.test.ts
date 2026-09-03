import { describe, it, expect } from "vitest";
import { createCampaignSchema } from "@/lib/harvester/campaign-validation";

describe("createCampaignSchema — metiers", () => {
  it("defaults metiers to an empty array when omitted", () => {
    const result = createCampaignSchema.safeParse({
      contractTypes: ["CDI"],
      locations: [{ label: "Paris", radiusKm: 10 }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.metiers).toEqual([]);
  });

  it("accepts a list of chosen métier labels", () => {
    const result = createCampaignSchema.safeParse({
      contractTypes: ["CDI"],
      locations: [{ label: "Paris", radiusKm: 10 }],
      metiers: ["Data Analyst", "Data Scientist"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.metiers).toEqual(["Data Analyst", "Data Scientist"]);
  });
});
