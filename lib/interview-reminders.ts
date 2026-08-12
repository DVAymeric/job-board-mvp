const DEFAULT_THRESHOLD_HOURS = 24;

export type InterviewCandidate = {
  id: string;
  title: string | null;
  companyName: string | null;
  interviewDate: Date | null;
};

export function getUpcomingInterviews<T extends InterviewCandidate>(
  jobs: T[],
  now: Date = new Date(),
  thresholdHours: number = DEFAULT_THRESHOLD_HOURS
): T[] {
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  return jobs.filter((job) => {
    if (!job.interviewDate) return false;
    const delta = job.interviewDate.getTime() - now.getTime();
    return delta >= 0 && delta <= thresholdMs;
  });
}
