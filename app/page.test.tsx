import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
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

describe("Home — nouvelle candidature", () => {
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

  it("shows separate title and company fields once a new url is checked", async () => {
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

    expect(await screen.findByPlaceholderText("Titre du poste")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Entreprise")).toBeInTheDocument();
  });

  it("submits title and companyName as separate fields", async () => {
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

    await user.type(
      await screen.findByPlaceholderText("Titre du poste"),
      "Développeur"
    );
    await user.type(screen.getByPlaceholderText("Entreprise"), "Acme");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(createJob).toHaveBeenCalledWith({
      url: "https://example.com/job",
      title: "Développeur",
      companyName: "Acme",
      companyLogoUrl: "",
      status: "TO_APPLY",
    });
  });

  it("includes the fetched company logo when submitting", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
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
    await screen.findByPlaceholderText("Titre du poste");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        companyLogoUrl: "https://logo.clearbit.com/example.com?size=128",
      })
    );
  });

  it("pre-fills title and company from fetched metadata, still editable", async () => {
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
        descriptionText: null,
      },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    const titleInput = await screen.findByPlaceholderText("Titre du poste");
    expect(titleInput).toHaveValue("Développeur Backend");
    expect(screen.getByPlaceholderText("Entreprise")).toHaveValue("Acme");

    await user.clear(titleInput);
    await user.type(titleInput, "Autre titre");
    expect(titleInput).toHaveValue("Autre titre");
  });

  it("leaves the fields empty for manual entry when the metadata fetch fails", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: null, companyName: null, descriptionText: null },
    });

    render(<Home />);
    await user.type(
      screen.getByPlaceholderText(/Colle l'URL/),
      "example.com/job"
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(await screen.findByPlaceholderText("Titre du poste")).toHaveValue("");
    expect(screen.getByPlaceholderText("Entreprise")).toHaveValue("");
  });
});

const archivedJob = {
  id: "job-1",
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

const activeJob = { ...archivedJob, archived: false, status: "APPLIED" };

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
