import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import type { Job } from "@prisma/client";
import Home from "@/components/home/home-content";
import {
  checkJobUrl,
  checkRepost,
  createJob,
  reactivateJobWithContent,
} from "@/app/actions";

vi.mock("@/app/actions", () => ({
  checkJobUrl: vi.fn(),
  checkRepost: vi.fn(),
  createJob: vi.fn(),
  reactivateJobWithContent: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams() as ReturnType<typeof useSearchParams>
  );
  vi.mocked(useRouter).mockReturnValue({
    replace: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>);
});

describe("Home — nouvelle candidature (vérification instantanée + enrichissement asynchrone, JOB-ASYNC-ENRICH)", () => {
  beforeEach(() => {
    vi.mocked(checkJobUrl).mockReset();
    vi.mocked(createJob).mockReset();
  });

  it("creates the job immediately after checkJobUrl, without waiting for any scraping call", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(createJob).mockResolvedValue({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "PENDING" },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByTestId("created-job-card")).toBeInTheDocument();
    expect(createJob).toHaveBeenCalledWith({
      url: "https://example.com/job",
      title: undefined,
      status: "TO_APPLY",
    });
  });

  it("shows a pending-enrichment indicator when the job is created without a title yet", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(createJob).mockResolvedValue({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "PENDING" },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByTestId("created-job-enriching")).toHaveTextContent(
      /récupération du titre en cours/i
    );
  });

  it("shows the resolved title directly when a title was already known at creation (e.g. bookmarklet fallback)", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        url: "https://example.com/careers/dev",
        title: "Développeur depuis LinkedIn",
      }) as ReturnType<typeof useSearchParams>
    );
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/careers/dev" },
    });
    vi.mocked(createJob).mockResolvedValue({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "DONE" },
    });

    render(<Home />);

    const card = await screen.findByTestId("created-job-card");
    expect(card).toHaveTextContent("Développeur depuis LinkedIn");
    expect(screen.queryByTestId("created-job-enriching")).not.toBeInTheDocument();
    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Développeur depuis LinkedIn" })
    );
  });

  it("shows an error when creation fails, without showing a created card", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(createJob).mockResolvedValue({
      ok: false,
      error: "Cette offre a déjà été enregistrée",
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByTestId("url-check-error")).toHaveTextContent(
      "Cette offre a déjà été enregistrée"
    );
    expect(screen.queryByTestId("created-job-card")).not.toBeInTheDocument();
  });
});

const archivedJob: Job = {
  id: "job-1",
  userId: "user-1",
  url: "https://example.com/job",
  title: "Développeur Backend",
  companyName: "Acme",
  companyLogoUrl: null,
  notes: null,
  status: "REJECTED",
  enrichmentStatus: "DONE",
  archived: true,
  order: 0,
  lastFollowUp: null,
  salaryAmount: null,
  salaryType: null,
  resumeUrl: null,
  coverLetterUrl: null,
  interviewDate: null,
  descriptionText: "Ancienne description.",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const activeJob: Job = { ...archivedJob, archived: false, status: "APPLIED" };

describe("Home — repost d'une offre archivée", () => {
  beforeEach(() => {
    vi.mocked(checkJobUrl).mockReset();
    vi.mocked(checkRepost).mockReset();
    vi.mocked(reactivateJobWithContent).mockReset();
  });

  it("offers to check for updates when the known job is archived", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: true, job: archivedJob },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(
      await screen.findByRole("button", { name: /Vérifier si l'offre a changé/ })
    ).toBeInTheDocument();
  });

  it("does not offer a repost check for an active (non-archived) duplicate", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: true, job: activeJob },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    await screen.findByText(/Déjà postulé le/);
    expect(
      screen.queryByRole("button", { name: /Vérifier si l'offre a changé/ })
    ).not.toBeInTheDocument();
  });

  it("shows the content diff when the reposted offer changed", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: true, job: archivedJob },
    });
    vi.mocked(checkRepost).mockResolvedValue({
      ok: true,
      data: {
        changed: true,
        diff: [
          { type: "removed", text: "Ancienne description." },
          { type: "added", text: "Nouvelle description." },
        ],
        fresh: {
          title: "Développeur Backend Senior",
          companyName: "Acme",
          descriptionText: "Nouvelle description.",
        },
      },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    await user.click(
      await screen.findByRole("button", { name: /Vérifier si l'offre a changé/ })
    );

    expect(checkRepost).toHaveBeenCalledWith("job-1");
    expect(await screen.findByText(/Ancienne description\./)).toBeInTheDocument();
    expect(screen.getByText(/Nouvelle description\./)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Réactiver avec le nouveau contenu/ })
    ).toBeInTheDocument();
  });

  it("shows a no-change message when the reposted offer is identical", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: true, job: archivedJob },
    });
    vi.mocked(checkRepost).mockResolvedValue({
      ok: true,
      data: {
        changed: false,
        diff: [{ type: "unchanged", text: "Ancienne description." }],
        fresh: {
          title: "Développeur Backend",
          companyName: "Acme",
          descriptionText: "Ancienne description.",
        },
      },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    await user.click(
      await screen.findByRole("button", { name: /Vérifier si l'offre a changé/ })
    );

    expect(
      await screen.findByText(/Aucun changement de contenu détecté/)
    ).toBeInTheDocument();
  });

  it("reactivates the job with the fresh content when confirmed", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: true, job: archivedJob },
    });
    vi.mocked(checkRepost).mockResolvedValue({
      ok: true,
      data: {
        changed: true,
        diff: [
          { type: "removed", text: "Ancienne description." },
          { type: "added", text: "Nouvelle description." },
        ],
        fresh: {
          title: "Développeur Backend Senior",
          companyName: "Acme",
          descriptionText: "Nouvelle description.",
        },
      },
    });
    vi.mocked(reactivateJobWithContent).mockResolvedValue({
      ok: true,
      data: null,
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    await user.click(
      await screen.findByRole("button", { name: /Vérifier si l'offre a changé/ })
    );
    await user.click(
      await screen.findByRole("button", {
        name: /Réactiver avec le nouveau contenu/,
      })
    );

    expect(reactivateJobWithContent).toHaveBeenCalledWith({
      id: "job-1",
      title: "Développeur Backend Senior",
      companyName: "Acme",
      descriptionText: "Nouvelle description.",
    });
  });
});

describe("Home — bookmarklet", () => {
  beforeEach(() => {
    vi.mocked(checkJobUrl).mockReset();
    vi.mocked(createJob).mockReset();
  });

  it("pre-fills the url and auto-checks it as soon as the page loads", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        url: "https://example.com/careers/dev",
        title: "Développeur depuis LinkedIn",
      }) as ReturnType<typeof useSearchParams>
    );
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/careers/dev" },
    });
    vi.mocked(createJob).mockResolvedValue({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "DONE" },
    });

    render(<Home />);

    expect(
      await screen.findByDisplayValue("https://example.com/careers/dev")
    ).toBeInTheDocument();
    expect(checkJobUrl).toHaveBeenCalledWith("https://example.com/careers/dev");
    await screen.findByTestId("created-job-card");
  });

  it("clears the query string once the bookmarklet url has been consumed", async () => {
    const replace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        url: "https://example.com/careers/dev",
      }) as ReturnType<typeof useSearchParams>
    );
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/careers/dev" },
    });
    vi.mocked(createJob).mockResolvedValue({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "PENDING" },
    });

    render(<Home />);

    await screen.findByTestId("created-job-card");
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("does not auto-check anything when there is no bookmarklet url", () => {
    render(<Home />);
    expect(checkJobUrl).not.toHaveBeenCalled();
  });
});

describe("Home — intégration visuelle des états dans la carte hero", () => {
  beforeEach(() => {
    vi.mocked(checkJobUrl).mockReset();
    vi.mocked(createJob).mockReset();
  });

  it("renders the known-url panel with the hero's dark translucent card style", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: true, job: activeJob },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    const panel = await screen.findByTestId("known-job-card");
    expect(panel.className).toContain("bg-white/10");
    expect(panel.className).toContain("border-white/15");
  });

  it("renders the created panel with the hero's dark translucent card style", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(createJob).mockResolvedValue({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "PENDING" },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    const panel = await screen.findByTestId("created-job-card");
    expect(panel.className).toContain("bg-white/10");
    expect(panel.className).toContain("border-white/15");
  });
});
