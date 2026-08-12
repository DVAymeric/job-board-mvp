const INTERVIEW_DURATION_HOURS = 1;

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export type IcsJob = {
  id: string;
  title: string | null;
  companyName: string | null;
  url: string;
  interviewDate: Date;
};

export function buildInterviewIcs(job: IcsJob): string {
  const start = job.interviewDate;
  const end = new Date(start.getTime() + INTERVIEW_DURATION_HOURS * 60 * 60 * 1000);
  const label =
    job.title && job.companyName
      ? `${job.title} chez ${job.companyName}`
      : job.title || job.companyName || job.url;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobBoardMVP//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${job.id}@job-board-mvp`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(`Entretien - ${label}`)}`,
    `DESCRIPTION:${escapeIcsText(job.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n") + "\r\n";
}
