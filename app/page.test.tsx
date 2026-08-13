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
  fetchCompanyLogo,
  fetchJobMetadata,
  reactivateJobWithContent,
} from "@/app/actions";

vi.mock("@/app/actions", () => ({
  checkJobUrl: vi.fn(),
  checkRepost: vi.fn(),
  createJob: vi.fn(),
  fetchCompanyLogo: vi.fn(),
  fetchJobMetadata: vi.fn(),
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

describe("Home — nouvelle candidature (auto-création par scraping)", () => {
  beforeEach(() => {
    vi.mocked(checkJobUrl).mockReset();
    vi.mocked(createJob).mockReset();
    vi.mocked(fetchJobMetadata).mockReset();
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: null, companyName: null, descriptionText: null },
    });
    vi.mocked(fetchCompanyLogo).mockReset();
    vi.mocked(fetchCompanyLogo).mockResolvedValue({
      ok: true,
      data: { logoUrl: null },
    });
  });

  it("auto-creates the job as soon as a title is scraped, without any manual form", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: {
        title: "Développeur Backend",
        companyName: "Acme",
        descriptionText: "Description.",
      },
    });
    vi.mocked(fetchCompanyLogo).mockResolvedValue({
      ok: true,
      data: { logoUrl: "https://logo.clearbit.com/example.com?size=128" },
    });
    vi.mocked(createJob).mockResolvedValue({ ok: true, data: { id: "job-1" } });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByTestId("created-job-card")).toBeInTheDocument();
    expect(createJob).toHaveBeenCalledWith({
      url: "https://example.com/job",
      title: "Développeur Backend",
      companyName: "Acme",
      companyLogoUrl: "https://logo.clearbit.com/example.com?size=128",
      descriptionText: "Description.",
      status: "TO_APPLY",
    });
    expect(screen.getByText(/Développeur Backend/)).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Titre du poste")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enregistrer" })).not.toBeInTheDocument();
  });

  it("shows a loading state while the job page is being scraped", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    let resolveMetadata!: (
      value: Awaited<ReturnType<typeof fetchJobMetadata>>
    ) => void;
    vi.mocked(fetchJobMetadata).mockReturnValue(
      new Promise((resolve) => {
        resolveMetadata = resolve;
      })
    );
    vi.mocked(createJob).mockResolvedValue({ ok: true, data: { id: "job-1" } });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByTestId("fetching-status")).toBeInTheDocument();

    resolveMetadata({
      ok: true,
      data: { title: "Développeur", companyName: null, descriptionText: null },
    });
    await screen.findByTestId("created-job-card");
  });

  it("falls back to a minimal manual form when no title could be scraped", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(
      await screen.findByText(/Impossible de récupérer automatiquement/)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Titre du poste")).toHaveValue("");
    expect(createJob).not.toHaveBeenCalled();
  });

  it("lets the fallback form save manually once a title is filled in", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(createJob).mockResolvedValue({ ok: true, data: { id: "job-1" } });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    const titleInput = await screen.findByPlaceholderText("Titre du poste");
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

    await user.type(titleInput, "Développeur");
    await user.type(screen.getByPlaceholderText("Entreprise"), "Acme");
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(createJob).toHaveBeenCalledWith({
      url: "https://example.com/job",
      title: "Développeur",
      companyName: "Acme",
      companyLogoUrl: "",
      descriptionText: undefined,
      status: "TO_APPLY",
    });
  });

  it("shows an error if automatic creation fails after a successful scrape", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: "Développeur", companyName: null, descriptionText: null },
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
    vi.mocked(fetchJobMetadata).mockReset();
    vi.mocked(fetchCompanyLogo).mockReset();
    vi.mocked(fetchCompanyLogo).mockResolvedValue({
      ok: true,
      data: { logoUrl: null },
    });
  });

  it("pre-fills the url, auto-checks it, and auto-creates using the bookmarklet's fallback title", async () => {
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
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: null, companyName: null, descriptionText: null },
    });
    vi.mocked(createJob).mockResolvedValue({ ok: true, data: { id: "job-1" } });

    render(<Home />);

    expect(
      await screen.findByDisplayValue("https://example.com/careers/dev")
    ).toBeInTheDocument();
    expect(checkJobUrl).toHaveBeenCalledWith("https://example.com/careers/dev");
    expect(await screen.findByTestId("created-job-card")).toBeInTheDocument();
    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Développeur depuis LinkedIn" })
    );
  });

  it("prefers the fetched metadata title over the bookmarklet's fallback title", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams({
        url: "https://example.com/careers/dev",
        title: "Titre de secours",
      }) as ReturnType<typeof useSearchParams>
    );
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/careers/dev" },
    });
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: "Titre extrait", companyName: null, descriptionText: null },
    });
    vi.mocked(createJob).mockResolvedValue({ ok: true, data: { id: "job-1" } });

    render(<Home />);

    await screen.findByTestId("created-job-card");
    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Titre extrait" })
    );
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
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: null, companyName: null, descriptionText: null },
    });

    render(<Home />);

    await screen.findByPlaceholderText("Titre du poste");
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
    vi.mocked(fetchJobMetadata).mockReset();
    vi.mocked(fetchCompanyLogo).mockReset();
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: null, companyName: null, descriptionText: null },
    });
    vi.mocked(fetchCompanyLogo).mockResolvedValue({
      ok: true,
      data: { logoUrl: null },
    });
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

  it("renders the fallback form panel with the hero's dark translucent card style", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    const panel = await screen.findByTestId("fallback-job-card");
    expect(panel.className).toContain("bg-white/10");
    expect(panel.className).toContain("border-white/15");
  });

  it("keeps the known/fallback panels inside the hero section, not below it", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    const panel = await screen.findByTestId("fallback-job-card");
    expect(panel.closest("section")).not.toBeNull();
  });
});
