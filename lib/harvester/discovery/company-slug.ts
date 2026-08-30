import { normalizeCompanyName } from "@/lib/harvester/company-name";

export function companySlug(companyName: string): string {
  return normalizeCompanyName(companyName).replace(/\s+/g, "-");
}
