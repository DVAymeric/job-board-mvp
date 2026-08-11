import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { checkJobUrl, createJob, fetchJobMetadata } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  checkJobUrl: vi.fn(),
  createJob: vi.fn(),
  fetchJobMetadata: vi.fn(),
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
      data: { title: null, companyName: null },
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
      status: "TO_APPLY",
    });
  });

  it("pre-fills title and company from fetched metadata, still editable", async () => {
    const user = userEvent.setup();
    vi.mocked(checkJobUrl).mockResolvedValue({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/job" },
    });
    vi.mocked(fetchJobMetadata).mockResolvedValue({
      ok: true,
      data: { title: "Développeur Backend", companyName: "Acme" },
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
      data: { title: null, companyName: null },
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
