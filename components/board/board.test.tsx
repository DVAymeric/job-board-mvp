import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JobWithRelations } from "@/lib/types";
import { Board } from "@/components/board/board";
import { reorderJobs, updateJobStatus } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  addTagToJob: vi.fn(),
  archiveJob: vi.fn(),
  deleteJob: vi.fn(),
  markFollowUpToday: vi.fn(),
  removeTagFromJob: vi.fn(),
  reorderJobs: vi.fn(),
  updateJobDetails: vi.fn(),
  updateJobStatus: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function job(overrides: Partial<JobWithRelations>): JobWithRelations {
  return {
    id: overrides.id ?? "job-1",
    userId: "user-1",
    url: "https://example.com/careers/dev",
    title: null,
    companyName: null,
    companyLogoUrl: null,
    notes: null,
    status: "TO_APPLY",
    enrichmentStatus: "DONE",
    archived: false,
    order: 0,
    lastFollowUp: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    salaryAmount: null,
    salaryType: null,
    resumeUrl: null,
    coverLetterUrl: null,
    interviewDate: null,
    descriptionText: null,
    tags: [],
    contacts: [],
    statusHistory: [],
    ...overrides,
  };
}

const jobs: JobWithRelations[] = [
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

describe("Board tag filter", () => {
  it("filters cards to those carrying the selected tag", async () => {
    const user = userEvent.setup();
    const taggedJobs = [
      job({
        id: "job-1",
        title: "Développeur Backend",
        tags: [
          {
            jobId: "job-1",
            tagId: "tag-remote",
            tag: { id: "tag-remote", userId: "user-1", name: "Remote" },
          },
        ],
      }),
      job({ id: "job-2", title: "Chef de projet", tags: [] }),
    ];
    render(<Board initialJobs={taggedJobs} />);

    expect(screen.getByText("Développeur Backend")).toBeInTheDocument();
    expect(screen.getByText("Chef de projet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remote" }));

    expect(screen.getByText("Développeur Backend")).toBeInTheDocument();
    expect(screen.queryByText("Chef de projet")).not.toBeInTheDocument();
  });
});

describe("Board keyboard shortcuts", () => {
  it("focuses the first card when pressing ArrowDown with nothing focused", async () => {
    const user = userEvent.setup();
    render(<Board initialJobs={jobs} />);

    await user.keyboard("{ArrowDown}");

    expect(screen.getByText("Développeur Backend").closest('[role="button"]')).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("moves focus across columns with ArrowRight", async () => {
    const user = userEvent.setup();
    render(<Board initialJobs={jobs} />);

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowRight}");

    expect(screen.getByText("Chef de projet").closest('[role="button"]')).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("opens the job dialog when pressing Enter on the focused card", async () => {
    const user = userEvent.setup();
    render(<Board initialJobs={jobs} />);

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(
      await screen.findByRole("dialog")
    ).toBeInTheDocument();
  });

  it("moves the focused card to the next status with Shift+ArrowRight", async () => {
    vi.mocked(updateJobStatus).mockResolvedValue({ ok: true, data: null });
    vi.mocked(reorderJobs).mockResolvedValue({ ok: true, data: null });
    const user = userEvent.setup();
    render(<Board initialJobs={jobs} />);

    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");

    await waitFor(() =>
      expect(updateJobStatus).toHaveBeenCalledWith("job-1", "APPLIED")
    );
  });

  it("ignores arrow keys while the search input is focused", async () => {
    const user = userEvent.setup();
    render(<Board initialJobs={jobs} />);

    await user.click(screen.getByPlaceholderText(/Rechercher/));
    await user.keyboard("{ArrowDown}");

    expect(screen.getByText("Développeur Backend").closest('[role="button"]')).not.toHaveAttribute(
      "aria-current",
      "true"
    );
  });
});
