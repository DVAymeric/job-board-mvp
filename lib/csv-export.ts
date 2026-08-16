import { JobStatus, STATUS_CONFIG } from "@/lib/constants";

// Ordre et libellés pensés pour un lecteur externe (conseiller emploi,
// mission locale, tuteur) ouvrant le fichier dans Excel/Google Sheets — pas
// de champs techniques (IDs internes, URL brute de scraping, statut
// d'enrichissement).
const CSV_HEADERS = [
  "Poste",
  "Entreprise",
  "Statut",
  "Date de candidature",
  "Dernière relance",
  "Tags",
];

// Séparateur `;` (pas `,`) : c'est ce qu'Excel en localisation française
// attend pour bien séparer les colonnes automatiquement à l'ouverture.
const CSV_SEPARATOR = ";";

function escapeCsvField(value: string): string {
  if (new RegExp(`["${CSV_SEPARATOR},\r\n]`).test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR");
}

export type ExportableJob = {
  title: string | null;
  companyName: string | null;
  status: string;
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
      formatDate(job.createdAt),
      job.lastFollowUp ? formatDate(job.lastFollowUp) : "",
      job.tags.map((jt) => jt.tag.name).join("; "),
    ]
      .map(escapeCsvField)
      .join(CSV_SEPARATOR)
  );

  // BOM UTF-8 en tête : sans lui, les caractères accentués (é, à, è...)
  // s'affichent mal dans Excel à l'ouverture directe du fichier.
  return "﻿" + [CSV_HEADERS.join(CSV_SEPARATOR), ...rows].join("\r\n");
}
