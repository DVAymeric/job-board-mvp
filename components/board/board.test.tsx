import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Job } from "@prisma/client";
import { Board } from "@/components/board/board";

vi.mock("@/app/actions", () => ({
  archiveJob: vi.fn(),
  deleteJob: vi.fn(),
  markFollowUpToday: vi.fn(),
  reorderJobs: vi.fn(),
  updateJobDetails: vi.fn(),
  updateJobStatus: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function job(overrides: Partial<Job>): Job {
  return {
    id: overrides.id ?? "job-1",
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
    ...overrides,
  };
}

const jobs: Job[] = [
  job({ id: "job-1", title: "Développeur Backend", companyName: "Acme" }),
  job({ id: "job-2", title: "Chef de projet", companyName: "Beta SAS", status: "APPLIED" }),
];

describe("Board search", () => {
  it("filters cards by title/company/url as the user types", async () => {
    const user = userEvent.setup();
    render(<Board initialJobs={jobs} />);

    expect(screen.getByText("Développeur Backend")).toBeInTheDocument();
    expect(screen.getByText("Chef de projet")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Rechercher/), "backend");

    await waitFor(() =>
      expect(screen.queryByText("Chef de projet")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Développeur Backend")).toBeInTheDocument();
  });

  it("shows an explicit empty state when no card matches the search", async () => {
    const user = userEvent.setup();
    render(<Board initialJobs={jobs} />);

    await user.type(screen.getByPlaceholderText(/Rechercher/), "introuvable");

    expect(
      await screen.findByText("Aucune candidature ne correspond")
    ).toBeInTheDocument();
  });

  it("combines the search query with the follow-up filter (AND)", async () => {
    const user = userEvent.setup();
    const followUpJob = job({
      id: "job-3",
      title: "Développeur Frontend",
      status: "APPLIED",
      lastFollowUp: new Date("2020-01-01"),
    });
    render(<Board initialJobs={[...jobs, followUpJob]} />);

    await user.click(screen.getByRole("button", { name: "Candidatures à relancer" }));
    expect(screen.getByText("Développeur Frontend")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Rechercher/), "backend");

    expect(
      await screen.findByText("Aucune candidature ne correspond")
    ).toBeInTheDocument();
    expect(screen.queryByText("Développeur Frontend")).not.toBeInTheDocument();
  });
});
