import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Job } from "@prisma/client";
import { JobCard } from "@/components/board/job-card";

const baseJob: Job = {
  id: "job-1",
  url: "https://example.com/careers/dev",
  title: null,
  companyName: null,
  companyLogoUrl: null,
  notes: null,
  status: "TO_APPLY",
  archived: false,
  order: 0,
  lastFollowUp: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("JobCard title/company display", () => {
  it("shows the title and the company name on separate lines", () => {
    render(
      <JobCard
        job={{ ...baseJob, title: "Développeur backend", companyName: "Acme" }}
        onOpen={() => {}}
      />
    );
    expect(screen.getByText("Développeur backend")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("shows only the title when no company name is set", () => {
    render(
      <JobCard job={{ ...baseJob, title: "Développeur backend" }} onOpen={() => {}} />
    );
    expect(screen.getByText("Développeur backend")).toBeInTheDocument();
  });

  it("falls back to the url hostname when neither title nor company are set", () => {
    render(<JobCard job={baseJob} onOpen={() => {}} />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });
});
