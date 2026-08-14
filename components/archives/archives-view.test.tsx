import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JobWithRelations } from "@/lib/types";
import { ArchivesView } from "@/components/archives/archives-view";
import { deleteJob, unarchiveJob } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  deleteJob: vi.fn(),
  unarchiveJob: vi.fn(),
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
    status: "REJECTED",
    archived: true,
    order: 0,
    lastFollowUp: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-10"),
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

describe("ArchivesView", () => {
  beforeEach(() => {
    vi.mocked(unarchiveJob).mockReset();
    vi.mocked(deleteJob).mockReset();
  });

  it("shows an empty state when there are no archived jobs", () => {
    render(<ArchivesView initialJobs={[]} />);
    expect(screen.getByText("Aucune candidature archivée")).toBeInTheDocument();
  });

  it("lists archived jobs and filters them by search", async () => {
    const user = userEvent.setup();
    render(
      <ArchivesView
        initialJobs={[
          job({ id: "job-1", title: "Développeur Backend" }),
          job({ id: "job-2", title: "Chef de projet" }),
        ]}
      />
    );

    expect(screen.getByText("Développeur Backend")).toBeInTheDocument();
    expect(screen.getByText("Chef de projet")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Rechercher/), "backend");

    expect(screen.getByText("Développeur Backend")).toBeInTheDocument();
    expect(screen.queryByText("Chef de projet")).not.toBeInTheDocument();
  });

  it("unarchives a job and removes it from the list", async () => {
    const user = userEvent.setup();
    vi.mocked(unarchiveJob).mockResolvedValue({ ok: true, data: null });

    render(
      <ArchivesView initialJobs={[job({ id: "job-1", title: "Développeur Backend" })]} />
    );

    await user.click(screen.getByRole("button", { name: "Désarchiver" }));

    expect(unarchiveJob).toHaveBeenCalledWith("job-1");
    expect(screen.queryByText("Développeur Backend")).not.toBeInTheDocument();
  });

  it("permanently deletes a job via the shared confirmation modal", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteJob).mockResolvedValue({ ok: true, data: null });

    render(
      <ArchivesView initialJobs={[job({ id: "job-1", title: "Développeur Backend" })]} />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));
    expect(deleteJob).not.toHaveBeenCalled();
    expect(screen.getByText("Supprimer cette candidature ?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(deleteJob).toHaveBeenCalledWith("job-1");
    expect(screen.queryByText("Développeur Backend")).not.toBeInTheDocument();
  });

  it("cancelling the delete modal deletes nothing", async () => {
    const user = userEvent.setup();

    render(
      <ArchivesView initialJobs={[job({ id: "job-1", title: "Développeur Backend" })]} />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(deleteJob).not.toHaveBeenCalled();
    expect(screen.getByText("Développeur Backend")).toBeInTheDocument();
  });

  it("shows the job's title and company in the confirmation before deleting", async () => {
    const user = userEvent.setup();

    render(
      <ArchivesView
        initialJobs={[
          job({ id: "job-1", title: "Développeur Backend", companyName: "Acme" }),
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    expect(screen.getByText(/Développeur Backend chez Acme/)).toBeInTheDocument();
  });
});

describe("ArchivesView — grille de cartes (JOB-98)", () => {
  it("renders each archived job as a card sharing the Board's card language, with a muted treatment", () => {
    // Désaturation seule, pas d'opacity (JOB-104) : opacity dilue aussi le
    // texte vers le fond clair et fait chuter le contraste sous le seuil AA.
    const { container } = render(
      <ArchivesView
        initialJobs={[job({ id: "job-1", title: "Développeur Backend" })]}
      />
    );

    const card = container.querySelector('[data-slot="card"]');
    expect(card).not.toBeNull();
    expect(card!.className).toMatch(/saturate-/);
  });

  it("lays archived jobs out as a grid, not a single-column row list", () => {
    const { container } = render(
      <ArchivesView
        initialJobs={[
          job({ id: "job-1", title: "Développeur Backend" }),
          job({ id: "job-2", title: "Chef de projet" }),
        ]}
      />
    );

    const grid = container.querySelector('[data-slot="card"]')?.parentElement;
    expect(grid?.className).toMatch(/grid/);
  });
});
