import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { JobWithRelations } from "@/lib/types";
import { JobCard } from "@/components/board/job-card";
import { deleteJob } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  deleteJob: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function getCard(container: HTMLElement): HTMLElement {
  const card = container.querySelector('[data-slot="card"]');
  if (!card) throw new Error("Card element not found");
  return card as HTMLElement;
}

const baseJob: JobWithRelations = {
  id: "job-1",
  userId: "user-1",
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
  salaryAmount: null,
  salaryType: null,
  resumeUrl: null,
  coverLetterUrl: null,
  interviewDate: null,
  descriptionText: null,
  tags: [],
  contacts: [],
  statusHistory: [],
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

  it("shows the job's tags as secondary badges", () => {
    render(
      <JobCard
        job={{
          ...baseJob,
          tags: [
            {
              jobId: "job-1",
              tagId: "tag-1",
              tag: { id: "tag-1", userId: "user-1", name: "Remote" },
            },
          ],
        }}
        onOpen={() => {}}
      />
    );
    const badge = screen.getByText("Remote");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });
});

describe("JobCard — accent par colonne (JOB-95)", () => {
  it("applies a bolder left accent border for INTERVIEW cards", () => {
    const { container } = render(
      <JobCard job={{ ...baseJob, status: "INTERVIEW" }} onOpen={() => {}} />
    );
    expect(getCard(container)).toHaveClass("border-l-8");
  });

  it("does not apply the bolder accent border for other statuses", () => {
    const { container } = render(
      <JobCard job={{ ...baseJob, status: "TO_APPLY" }} onOpen={() => {}} />
    );
    expect(getCard(container)).not.toHaveClass("border-l-8");
  });

  it("applies a muted treatment (reduced opacity/saturation) for REJECTED cards", () => {
    const { container } = render(
      <JobCard job={{ ...baseJob, status: "REJECTED" }} onOpen={() => {}} />
    );
    const card = getCard(container);
    expect(card.className).toMatch(/opacity-/);
    expect(card.className).toMatch(/saturate-/);
  });

  it("does not apply the muted treatment for other statuses", () => {
    const { container } = render(
      <JobCard job={{ ...baseJob, status: "APPLIED" }} onOpen={() => {}} />
    );
    const card = getCard(container);
    expect(card.className).not.toMatch(/saturate-/);
  });
});

describe("JobCard — actions au survol (JOB-96)", () => {
  beforeEach(() => {
    vi.mocked(deleteJob).mockReset();
  });

  it("exposes edit and delete actions in the DOM (revealed on hover/focus via CSS, always keyboard-reachable)", () => {
    render(
      <JobCard
        job={{ ...baseJob, title: "Développeur Backend" }}
        onOpen={() => {}}
        onDeleted={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Modifier" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Supprimer définitivement" })
    ).toBeInTheDocument();
  });

  it("clicking Modifier opens the job (same as clicking the card) exactly once", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <JobCard
        job={{ ...baseJob, title: "Développeur Backend" }}
        onOpen={onOpen}
        onDeleted={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: "Modifier" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith("job-1");
  });

  it("clicking Supprimer opens the shared confirm modal without opening the job dialog", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <JobCard
        job={{ ...baseJob, title: "Développeur Backend", companyName: "Acme" }}
        onOpen={onOpen}
        onDeleted={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    expect(onOpen).not.toHaveBeenCalled();
    expect(deleteJob).not.toHaveBeenCalled();
    expect(screen.getByText("Supprimer cette candidature ?")).toBeInTheDocument();
    expect(screen.getByText(/Développeur Backend chez Acme/)).toBeInTheDocument();
  });

  it("confirming deletion calls deleteJob and onDeleted", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteJob).mockResolvedValue({ ok: true, data: null });
    const onDeleted = vi.fn();
    render(
      <JobCard
        job={{ ...baseJob, title: "Développeur Backend" }}
        onOpen={() => {}}
        onDeleted={onDeleted}
      />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer définitivement" }));
    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(deleteJob).toHaveBeenCalledWith("job-1");
    expect(onDeleted).toHaveBeenCalledWith("job-1");
  });
});
