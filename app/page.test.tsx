import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { checkJobUrl, createJob } from "@/app/actions";

vi.mock("@/app/actions", () => ({
  checkJobUrl: vi.fn(),
  createJob: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("Home — nouvelle candidature", () => {
  beforeEach(() => {
    vi.mocked(checkJobUrl).mockReset();
    vi.mocked(createJob).mockReset();
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
});
