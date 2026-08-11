import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JobWithRelations } from "@/lib/types";
import { JobSheet } from "@/components/board/job-sheet";
import {
  addTagToJob,
  archiveJob,
  deleteJob,
  removeTagFromJob,
  updateJobDetails,
} from "@/app/actions";

vi.mock("@/app/actions", () => ({
  addTagToJob: vi.fn(),
  archiveJob: vi.fn(),
  deleteJob: vi.fn(),
  markFollowUpToday: vi.fn(),
  removeTagFromJob: vi.fn(),
  updateJobDetails: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseJob: JobWithRelations = {
  id: "job-1",
  url: "https://example.com/job",
  title: "Développeur",
  companyName: "Acme",
  companyLogoUrl: null,
  notes: null,
  status: "TO_APPLY",
  archived: false,
  order: 0,
  lastFollowUp: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  tags: [],
  contacts: [],
  statusHistory: [],
};

describe("JobSheet — édition titre / entreprise", () => {
  beforeEach(() => {
    vi.mocked(updateJobDetails).mockReset();
  });

  it("edits title and company name as two separate fields", async () => {
    const user = userEvent.setup();
    vi.mocked(updateJobDetails).mockResolvedValue({ ok: true, data: null });
    const onUpdated = vi.fn();

    render(
      <JobSheet job={baseJob} onOpenChange={vi.fn()} onUpdated={onUpdated} onDeleted={vi.fn()} />
    );

    const titleInput = screen.getByLabelText("Titre du poste");
    const companyInput = screen.getByLabelText("Entreprise");
    expect(titleInput).toHaveValue("Développeur");
    expect(companyInput).toHaveValue("Acme");

    await user.clear(titleInput);
    await user.type(titleInput, "Développeur senior");
    await user.clear(companyInput);
    await user.type(companyInput, "Beta");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateJobDetails).toHaveBeenCalledWith("job-1", "Développeur senior", "Beta");
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Développeur senior", companyName: "Beta" })
    );
  });
});

describe("JobSheet — tags", () => {
  beforeEach(() => {
    vi.mocked(addTagToJob).mockReset();
    vi.mocked(removeTagFromJob).mockReset();
  });

  it("shows the job's existing tags", () => {
    render(
      <JobSheet
        job={{
          ...baseJob,
          tags: [
            { jobId: "job-1", tagId: "tag-1", tag: { id: "tag-1", name: "Remote" } },
          ],
        }}
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.getByText("Remote")).toBeInTheDocument();
  });

  it("adds a new tag by name", async () => {
    const user = userEvent.setup();
    vi.mocked(addTagToJob).mockResolvedValue({
      ok: true,
      data: { tag: { id: "tag-1", name: "Remote" } },
    });
    const onUpdated = vi.fn();

    render(
      <JobSheet job={baseJob} onOpenChange={vi.fn()} onUpdated={onUpdated} onDeleted={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText("Ajouter un tag..."), "Remote");
    await user.click(screen.getByRole("button", { name: "Ajouter le tag" }));

    expect(addTagToJob).toHaveBeenCalledWith("job-1", "Remote");
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [{ jobId: "job-1", tagId: "tag-1", tag: { id: "tag-1", name: "Remote" } }],
      })
    );
  });

  it("removes an existing tag", async () => {
    const user = userEvent.setup();
    vi.mocked(removeTagFromJob).mockResolvedValue({ ok: true, data: null });
    const onUpdated = vi.fn();

    render(
      <JobSheet
        job={{
          ...baseJob,
          tags: [
            { jobId: "job-1", tagId: "tag-1", tag: { id: "tag-1", name: "Remote" } },
          ],
        }}
        onOpenChange={vi.fn()}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Retirer le tag Remote" }));

    expect(removeTagFromJob).toHaveBeenCalledWith("job-1", "tag-1");
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
  });
});

describe("JobSheet — archivage", () => {
  beforeEach(() => {
    vi.mocked(archiveJob).mockReset();
    vi.mocked(deleteJob).mockReset();
  });

  it("shows no confirmation dialog before any button is clicked", () => {
    render(
      <JobSheet job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={vi.fn()} />
    );
    expect(screen.queryByText(/archives/i)).not.toBeInTheDocument();
    expect(archiveJob).not.toHaveBeenCalled();
    expect(deleteJob).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before archiving, and does not hard-delete", async () => {
    const user = userEvent.setup();
    vi.mocked(archiveJob).mockResolvedValue({ ok: true, data: null });
    const onDeleted = vi.fn();

    render(
      <JobSheet job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={onDeleted} />
    );

    await user.click(screen.getByRole("button", { name: "Archiver" }));
    expect(archiveJob).not.toHaveBeenCalled();
    expect(screen.getByText(/archives/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmer l'archivage" }));

    expect(archiveJob).toHaveBeenCalledWith("job-1");
    expect(deleteJob).not.toHaveBeenCalled();
    expect(onDeleted).toHaveBeenCalledWith("job-1");
  });

  it("cancelling the archive dialog archives nothing", async () => {
    const user = userEvent.setup();
    render(
      <JobSheet job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Archiver" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(archiveJob).not.toHaveBeenCalled();
  });
});

describe("JobSheet — suppression définitive", () => {
  beforeEach(() => {
    vi.mocked(archiveJob).mockReset();
    vi.mocked(deleteJob).mockReset();
  });

  it("keeps the permanent-delete confirm button disabled until the exact phrase is typed", async () => {
    const user = userEvent.setup();
    render(
      <JobSheet job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));
    const confirmButton = screen.getByRole("button", {
      name: "Supprimer définitivement (irréversible)",
    });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("SUPPRIMER"), "supprimer");
    expect(confirmButton).toBeDisabled();

    await user.clear(screen.getByPlaceholderText("SUPPRIMER"));
    await user.type(screen.getByPlaceholderText("SUPPRIMER"), "SUPPRIMER");
    expect(confirmButton).toBeEnabled();
  });

  it("permanently deletes only once the confirmation phrase matches", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteJob).mockResolvedValue({ ok: true, data: null });
    const onDeleted = vi.fn();

    render(
      <JobSheet job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={onDeleted} />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));
    await user.type(screen.getByPlaceholderText("SUPPRIMER"), "SUPPRIMER");
    await user.click(
      screen.getByRole("button", { name: "Supprimer définitivement (irréversible)" })
    );

    expect(deleteJob).toHaveBeenCalledWith("job-1");
    expect(archiveJob).not.toHaveBeenCalled();
    expect(onDeleted).toHaveBeenCalledWith("job-1");
  });
});
