"use client";

import { useState } from "react";
import { extractCompanyDomain } from "@/lib/company-logo";
import { cn } from "@/lib/utils";

export type AvatarJob = {
  companyLogoUrl: string | null;
  companyName: string | null;
  title: string | null;
  url: string;
};

function getInitial(job: AvatarJob): string {
  const source = job.companyName || job.title || extractCompanyDomain(job.url) || job.url;
  return source.trim().charAt(0).toUpperCase() || "?";
}

export function CompanyAvatar({
  job,
  className,
}: {
  job: AvatarJob;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (job.companyLogoUrl && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={job.companyLogoUrl}
        alt={job.companyName ? `Logo ${job.companyName}` : "Logo entreprise"}
        className={cn(
          "size-8 shrink-0 rounded-md bg-muted object-contain",
          className
        )}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted font-heading text-sm text-muted-foreground",
        className
      )}
    >
      {getInitial(job)}
    </div>
  );
}
