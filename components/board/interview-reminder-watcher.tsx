"use client";

import { useEffect } from "react";
import {
  getUpcomingInterviews,
  type InterviewCandidate,
} from "@/lib/interview-reminders";

const NOTIFIED_KEY_PREFIX = "job-board-interview-notified:";

export function InterviewReminderWatcher({
  jobs,
}: {
  jobs: InterviewCandidate[];
}) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const upcoming = getUpcomingInterviews(jobs);
    if (upcoming.length === 0) return;

    async function notify() {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return;

      for (const job of upcoming) {
        const key = `${NOTIFIED_KEY_PREFIX}${job.id}:${job.interviewDate?.toISOString()}`;
        if (window.localStorage.getItem(key)) continue;

        const label =
          job.title && job.companyName
            ? `${job.title} chez ${job.companyName}`
            : job.title || job.companyName || "une candidature";

        new Notification("Entretien à venir", {
          body: `Entretien pour ${label} le ${job.interviewDate?.toLocaleString("fr-FR")}`,
        });
        window.localStorage.setItem(key, "1");
      }
    }

    notify();
  }, [jobs]);

  return null;
}
