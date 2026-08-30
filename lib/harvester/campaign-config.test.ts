import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "yaml";
import { CampaignsFileSchema, mapYamlCampaignToCreateInput } from "@/lib/harvester/campaign-config";

const fixturesDir = path.resolve(fileURLToPath(import.meta.url), "../__fixtures__");

function loadCampaignsYaml(): unknown {
  return parse(readFileSync(path.join(fixturesDir, "campaigns.yaml"), "utf-8"));
}

describe("CampaignsFileSchema", () => {
  it("parses the two campaigns from the legacy job-harvester campaigns.yaml fixture without loss", () => {
    const parsed = CampaignsFileSchema.parse(loadCampaignsYaml());

    expect(parsed.campaigns).toHaveLength(2);
    const [dataCampaign, devwebCampaign] = parsed.campaigns;

    expect(dataCampaign).toMatchObject({
      id: "alternance-data-hdf",
      name: "Data",
      romeCodes: ["M1403"],
      contractTypes: ["apprentissage", "professionnalisation", "stage", "cdi", "cdd"],
      schedule: "0 7 * * *",
    });
    expect(dataCampaign!.locations).toHaveLength(3);
    expect(dataCampaign!.targets).toEqual({
      workday: [{ tenant: "valeo", site: "valeo_jobs", dc: "wd3" }],
      smartrecruiters: ["MAZARS"],
    });

    expect(devwebCampaign).toMatchObject({
      id: "alternance-devweb-hdf",
      romeCodes: ["M1802", "M1805", "M1811"],
    });
    expect(devwebCampaign!.targets).toBeUndefined();
  });

  it("throws on a campaign with an unknown contract type", () => {
    expect(() =>
      CampaignsFileSchema.parse({
        campaigns: [
          {
            id: "bad",
            romeCodes: [],
            keywords: [],
            locations: [],
            contractTypes: ["interim"],
          },
        ],
      }),
    ).toThrow();
  });
});

describe("mapYamlCampaignToCreateInput", () => {
  it("maps a parsed campaign to Prisma create input, converting contract types to the uppercase Prisma enum", () => {
    const parsed = CampaignsFileSchema.parse(loadCampaignsYaml());
    const dataCampaign = parsed.campaigns[0]!;

    const input = mapYamlCampaignToCreateInput(dataCampaign, "user-1");

    expect(input).toEqual({
      userId: "user-1",
      slug: "alternance-data-hdf",
      name: "Data",
      romeCodes: ["M1403"],
      keywords: ["data analyst", "data quality", "statistiques", "BI"],
      contractTypes: ["APPRENTISSAGE", "PROFESSIONNALISATION", "STAGE", "CDI", "CDD"],
      schedule: "0 7 * * *",
      config: {
        locations: dataCampaign.locations,
        targets: dataCampaign.targets,
      },
    });
  });

  it("omits targets from config when the campaign has none", () => {
    const parsed = CampaignsFileSchema.parse(loadCampaignsYaml());
    const devwebCampaign = parsed.campaigns[1]!;

    const input = mapYamlCampaignToCreateInput(devwebCampaign, "user-1");

    expect(input.config).toEqual({ locations: devwebCampaign.locations });
    expect(input.config).not.toHaveProperty("targets");
  });
});
