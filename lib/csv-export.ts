import { JobStatus, STATUS_CONFIG } from "@/lib/constants";

const CSV_HEADERS = [
  "Titre",
  "Entreprise",
  "Statut",
  "URL",
  "Tags",
  "Archivée",
  "Créée le",
  "Dernière relance",
];

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type ExportableJob = {
  title: string | null;
  companyName: string | null;
  status: string;
  url: string;
  archived: boolean;
  createdAt: Date;
  lastFollowUp: Date | null;
  tags: { tag: { name: string } }[];
};

export function buildJobsCsv(jobs: ExportableJob[]): string {
  const rows = jobs.map((job) =>
    [
      job.title ?? "",
      job.companyName ?? "",
      STATUS_CONFIG[job.status as JobStatus]?.label ?? job.status,
      job.url,
      job.tags.map((jt) => jt.tag.name).join("; "),
      job.archived ? "Oui" : "Non",
      job.createdAt.toISOString().slice(0, 10),
      job.lastFollowUp ? job.lastFollowUp.toISOString().slice(0, 10) : "",
    ]
      .map(escapeCsvField)
      .join(",")
  );

  return "﻿" + [CSV_HEADERS.join(","), ...rows].join("\r\n");
}
