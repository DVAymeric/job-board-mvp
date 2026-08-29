import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import type { Job } from "@prisma/client";
import Home from "@/components/home/home-content";
import { checkJobUrl, createJob } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  checkJobUrl: vi.fn(),
  createJob: vi.fn(),
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

const knownJob: Job = {
  id: "job-1",
  userId: "user-1",
  url: "https://example.com/job",
  title: "Développeur Backend",
  companyName: "Acme",
  companyLogoUrl: null,
  notes: null,
  contractType: null,
  status: "APPLIED",
  enrichmentStatus: "DONE",
  order: 0,
  lastFollowUp: null,
  salaryAmount: null,
  salaryType: null,
  resumeUrl: null,
  coverLetterUrl: null,
  interviewDate: null,
  descriptionText: "Description.",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

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
      data: { found: true, job: knownJob },
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
