import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Job } from "@prisma/client";
import { JobSheet } from "@/components/board/job-sheet";
import { deleteJob } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  deleteJob: vi.fn(),
  markFollowUpToday: vi.fn(),
  updateJobDetails: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseJob: Job = {
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
};

describe("JobSheet delete confirmation", () => {
  beforeEach(() => {
    vi.mocked(deleteJob).mockReset();
  });

  it("does not show the confirmation dialog before the delete button is clicked", () => {
    render(
      <JobSheet
        job={baseJob}
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.queryByText(/irréversible/i)).not.toBeInTheDocument();
    expect(deleteJob).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation in an AlertDialog before deleting", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteJob).mockResolvedValue({ ok: true, data: null });
    const onDeleted = vi.fn();

    render(
      <JobSheet
        job={baseJob}
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(deleteJob).not.toHaveBeenCalled();
    expect(screen.getByText(/irréversible/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(deleteJob).toHaveBeenCalledWith("job-1");
    expect(onDeleted).toHaveBeenCalledWith("job-1");
  });

  it("cancelling the dialog does not delete the job", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();

    render(
      <JobSheet
        job={baseJob}
        onOpenChange={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(deleteJob).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
