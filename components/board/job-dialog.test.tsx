import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JobWithRelations } from "@/lib/types";
import { JobDialog } from "@/components/board/job-dialog";
import {
  addTagToJob,
  archiveJob,
  removeTagFromJob,
  updateJobDetails,
  updateJobNotes,
} from "@/app/actions";

vi.mock("@/app/actions", () => ({
  addContact: vi.fn(),
  addTagToJob: vi.fn(),
  archiveJob: vi.fn(),
  deleteContact: vi.fn(),
  markFollowUpToday: vi.fn(),
  removeTagFromJob: vi.fn(),
  updateContact: vi.fn(),
  updateJobDetails: vi.fn(),
  updateJobNotes: vi.fn(),
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

describe("JobDialog — modale centrée (pas une sidebar)", () => {
  it("renders as a centered dialog with a backdrop, not a side sheet", () => {
    render(
      <JobDialog job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={vi.fn()} />
    );

    // base-ui portals the popup/backdrop onto document.body, outside the
    // render container.
    const popup = document.body.querySelector('[data-slot="dialog-content"]');
    const overlay = document.body.querySelector('[data-slot="dialog-overlay"]');
    expect(popup).toBeInTheDocument();
    expect(overlay).toBeInTheDocument();
    // A side sheet carries a data-side attribute (left/right/...); a centered
    // dialog must not.
    expect(popup).not.toHaveAttribute("data-side");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("JobDialog — édition titre / entreprise", () => {
  beforeEach(() => {
    vi.mocked(updateJobDetails).mockReset();
  });

  it("edits title and company name as two separate fields", async () => {
    const user = userEvent.setup();
    vi.mocked(updateJobDetails).mockResolvedValue({ ok: true, data: null });
    const onUpdated = vi.fn();

    render(
      <JobDialog job={baseJob} onOpenChange={vi.fn()} onUpdated={onUpdated} onDeleted={vi.fn()} />
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

describe("JobDialog — tags", () => {
  beforeEach(() => {
    vi.mocked(addTagToJob).mockReset();
    vi.mocked(removeTagFromJob).mockReset();
  });

  it("shows the job's existing tags", () => {
    render(
      <JobDialog
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
      <JobDialog job={baseJob} onOpenChange={vi.fn()} onUpdated={onUpdated} onDeleted={vi.fn()} />
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
      <JobDialog
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

describe("JobDialog — notes", () => {
  beforeEach(() => {
    vi.mocked(updateJobNotes).mockReset();
  });

  it("loads the job's existing notes into the textarea", () => {
    render(
      <JobDialog
        job={{ ...baseJob, notes: "Contact via une connexion LinkedIn" }}
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Notes")).toHaveValue(
      "Contact via une connexion LinkedIn"
    );
  });

  it("saves notes via a dedicated button", async () => {
    const user = userEvent.setup();
    vi.mocked(updateJobNotes).mockResolvedValue({ ok: true, data: null });
    const onUpdated = vi.fn();

    render(
      <JobDialog job={baseJob} onOpenChange={vi.fn()} onUpdated={onUpdated} onDeleted={vi.fn()} />
    );

    const notesField = screen.getByLabelText("Notes");
    const saveButton = screen.getByRole("button", { name: "Enregistrer les notes" });
    expect(saveButton).toBeDisabled();

    await user.type(notesField, "Relancer après l'entretien");
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    expect(updateJobNotes).toHaveBeenCalledWith("job-1", "Relancer après l'entretien");
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "Relancer après l'entretien" })
    );
  });
});

describe("JobDialog — timeline de statut", () => {
  it("renders the job's status history entries", () => {
    render(
      <JobDialog
        job={{
          ...baseJob,
          statusHistory: [
            {
              id: "sh-1",
              jobId: "job-1",
              status: "TO_APPLY",
              changedAt: new Date("2026-01-01"),
            },
            {
              id: "sh-2",
              jobId: "job-1",
              status: "APPLIED",
              changedAt: new Date("2026-01-05"),
            },
          ],
        }}
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.getByText("Historique de statut")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("JobDialog — contacts", () => {
  it("renders the job's existing contacts", () => {
    render(
      <JobDialog
        job={{
          ...baseJob,
          contacts: [
            {
              id: "contact-1",
              jobId: "job-1",
              name: "Jane Doe",
              role: "RECRUITER",
              linkedinUrl: null,
              createdAt: new Date("2026-01-01"),
              updatedAt: new Date("2026-01-01"),
            },
          ],
        }}
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
  });
});

describe("JobDialog — archivage", () => {
  beforeEach(() => {
    vi.mocked(archiveJob).mockReset();
  });

  it("shows no confirmation dialog before any button is clicked", () => {
    render(
      <JobDialog job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={vi.fn()} />
    );
    expect(screen.queryByText(/archives/i)).not.toBeInTheDocument();
    expect(archiveJob).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before archiving", async () => {
    const user = userEvent.setup();
    vi.mocked(archiveJob).mockResolvedValue({ ok: true, data: null });
    const onDeleted = vi.fn();

    render(
      <JobDialog job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={onDeleted} />
    );

    await user.click(screen.getByRole("button", { name: "Archiver" }));
    expect(archiveJob).not.toHaveBeenCalled();
    expect(screen.getByText(/archives/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmer l'archivage" }));

    expect(archiveJob).toHaveBeenCalledWith("job-1");
    expect(onDeleted).toHaveBeenCalledWith("job-1");
  });

  it("cancelling the archive dialog archives nothing", async () => {
    const user = userEvent.setup();
    render(
      <JobDialog job={baseJob} onOpenChange={vi.fn()} onUpdated={vi.fn()} onDeleted={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Archiver" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(archiveJob).not.toHaveBeenCalled();
  });
});
