import { USER_AGENT } from "@/lib/harvester/user-agent";

export interface DiscoveredWorkdayTarget {
  tenant: string;
  site: string;
  dc: string;
}

const DC_CANDIDATES = ["wd1", "wd3", "wd5"];

export async function probeWorkday(slug: string, fetchImpl: typeof fetch): Promise<DiscoveredWorkdayTarget | undefined> {
  const tenant = slug.replace(/-/g, "");
  const site = `${tenant}_jobs`;
  for (const dc of DC_CANDIDATES) {
    const url = `https://${tenant}.${dc}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return { tenant, site, dc };
    } catch {
      continue;
    }
  }
  return undefined;
}
