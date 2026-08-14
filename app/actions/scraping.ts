"use server";

import { checkJobUrlSchema } from "@/lib/validation";
import { safeFetch } from "@/lib/safe-fetch";
import type { ScrapedJobMetadata } from "@/lib/scraper";
import {
  buildBrandfetchLogoUrl,
  buildClearbitLogoUrl,
  extractCompanyDomain,
} from "@/lib/company-logo";
import { type ActionResult, logActionError, resolveScrapedMetadata } from "./_shared";

export async function fetchJobMetadata(
  rawUrl: string
): Promise<ActionResult<ScrapedJobMetadata>> {
  return { ok: true, data: await resolveScrapedMetadata(rawUrl) };
}

const LOGO_FETCH_TIMEOUT_MS = 3000;

async function logoUrlResolves(url: string): Promise<boolean> {
  try {
    const response = await safeFetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
    });
    return (
      !!response &&
      response.ok &&
      (response.headers.get("content-type") ?? "").startsWith("image/")
    );
  } catch (error) {
    logActionError("fetchCompanyLogo", error, undefined, "warn");
    return false;
  }
}

export async function fetchCompanyLogo(
  rawUrl: string
): Promise<ActionResult<{ logoUrl: string | null }>> {
  const empty = { logoUrl: null };
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { ok: true, data: empty };
  }
  const domain = extractCompanyDomain(parsed.data);
  if (!domain) {
    return { ok: true, data: empty };
  }

  const clearbitUrl = buildClearbitLogoUrl(domain);
  if (await logoUrlResolves(clearbitUrl)) {
    return { ok: true, data: { logoUrl: clearbitUrl } };
  }

  const brandfetchClientId = process.env.BRANDFETCH_CLIENT_ID;
  if (brandfetchClientId) {
    const brandfetchUrl = buildBrandfetchLogoUrl(domain, brandfetchClientId);
    if (await logoUrlResolves(brandfetchUrl)) {
      return { ok: true, data: { logoUrl: brandfetchUrl } };
    }
  }

  return { ok: true, data: empty };
}
