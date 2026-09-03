import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Campaign } from "@prisma/client";
import { CampaignsManager } from "@/components/harvester/campaigns-manager";
import { createCampaign, deleteCampaign } from "@/app/actions/campaigns";
import { triggerCampaignCollection } from "@/app/actions/harvest";

vi.mock("@/app/actions/campaigns", () => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}));

vi.mock("@/app/actions/harvest", () => ({
  triggerCampaignCollection: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const campaign: Campaign = {
  id: "campaign-1",
  userId: "user-1",
  slug: "alternance-data-hdf",
  name: null,
  romeCodes: ["M1403"],
  keywords: [],
  metiers: [],
  contractTypes: ["APPRENTISSAGE", "PROFESSIONNALISATION"],
  schedule: null,
  order: 0,
  config: { locations: [{ label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 }] },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("CampaignsManager", () => {
  it("shows an empty state when there are no campaigns", () => {
    render(<CampaignsManager initialCampaigns={[]} />);
    expect(screen.getByText(/Aucune campagne pour le moment/)).toBeInTheDocument();
  });

  it("lists existing campaigns with their contract types", () => {
    render(<CampaignsManager initialCampaigns={[campaign]} />);
    expect(screen.getByText("alternance-data-hdf")).toBeInTheDocument();
    expect(screen.getByText("Apprentissage · Professionnalisation")).toBeInTheDocument();
  });

  it("shows the display name instead of the raw slug when one is set, keeping the slug visible as secondary meta", () => {
    render(<CampaignsManager initialCampaigns={[{ ...campaign, name: "Data" }]} />);
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("alternance-data-hdf")).toBeInTheDocument();
  });

  it("opens the create dialog on 'Nouvelle campagne'", async () => {
    const user = userEvent.setup();
    render(<CampaignsManager initialCampaigns={[]} />);

    await user.click(screen.getByRole("button", { name: /nouvelle campagne/i }));

    expect(screen.getByRole("heading", { name: "Nouvelle campagne" })).toBeInTheDocument();
  });

  it("opens the edit dialog when a campaign row is clicked", async () => {
    const user = userEvent.setup();
    render(<CampaignsManager initialCampaigns={[campaign]} />);

    await user.click(screen.getByText("alternance-data-hdf"));

    expect(screen.getByText("Modifier la campagne")).toBeInTheDocument();
  });

  it(
    "adds a newly created campaign to the list without a full page reload",
    async () => {
      const user = userEvent.setup();
      vi.mocked(createCampaign).mockResolvedValue({ ok: true, data: { campaign } });
      render(<CampaignsManager initialCampaigns={[]} />);

      await user.click(screen.getByRole("button", { name: /nouvelle campagne/i }));
      await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
      await user.type(screen.getByLabelText("Ville"), "Lille");
      await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

      expect(await screen.findByText("alternance-data-hdf")).toBeInTheDocument();
      expect(screen.queryByText(/Aucune campagne pour le moment/)).not.toBeInTheDocument();
    },
    10000
  );

  it("removes a deleted campaign from the list", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteCampaign).mockResolvedValue({ ok: true, data: null });
    render(<CampaignsManager initialCampaigns={[campaign]} />);

    await user.click(screen.getByText("alternance-data-hdf"));
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(await screen.findByText(/Aucune campagne pour le moment/)).toBeInTheDocument();
  });

  it("triggers a manual collection and shows the number of offers collected", async () => {
    const user = userEvent.setup();
    vi.mocked(triggerCampaignCollection).mockResolvedValue({
      ok: true,
      data: { runs: [{ runId: "r1", rawCount: 5, normalizedCount: 3, rejectedCount: 2, filteredCount: 0, ok: true }] },
    });
    render(<CampaignsManager initialCampaigns={[campaign]} />);

    await user.click(screen.getByRole("button", { name: "Chercher des offres" }));

    expect(triggerCampaignCollection).toHaveBeenCalledWith({ campaignId: "campaign-1" });
    // The dialog never opens for a trigger click, unlike clicking the row itself.
    expect(screen.queryByText("Modifier la campagne")).not.toBeInTheDocument();
  });

  // JOB-161 : `disabled={triggering}` seul ne suffit pas — un deuxième clic tiré avant que React
  // ait commité le premier `setTriggeringId` passait encore au travers, déclenchant deux
  // collectes pour la même campagne. Deux `fireEvent.click` synchrones (sans attendre entre les
  // deux, contrairement à `userEvent.click`) reproduisent cette fenêtre de course.
  it("does not trigger a second collection when clicked twice before the first request settles (JOB-161)", async () => {
    // Ce fichier ne réinitialise jamais triggerCampaignCollection entre les tests (pas de
    // beforeEach) — mockClear() ici isole le compteur d'appels des tests précédents, sans
    // changer leur comportement.
    vi.mocked(triggerCampaignCollection).mockClear();
    let resolveTrigger: (value: Awaited<ReturnType<typeof triggerCampaignCollection>>) => void;
    vi.mocked(triggerCampaignCollection).mockReturnValue(
      new Promise((resolve) => {
        resolveTrigger = resolve;
      })
    );
    render(<CampaignsManager initialCampaigns={[campaign]} />);

    const button = screen.getByRole("button", { name: "Chercher des offres" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(triggerCampaignCollection).toHaveBeenCalledTimes(1);

    resolveTrigger!({
      ok: true,
      data: { runs: [{ runId: "r1", rawCount: 0, normalizedCount: 0, rejectedCount: 0, filteredCount: 0, ok: true }] },
    });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("opens a pre-filled 'new campaign' dialog from 'Dupliquer', keeping it a create (not an edit)", async () => {
    const user = userEvent.setup();
    render(
      <CampaignsManager
        initialCampaigns={[{ ...campaign, name: "Data", keywords: ["data analyst", "BI"] }]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Dupliquer Data" }));

    expect(screen.getByRole("heading", { name: "Dupliquer la campagne" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom (optionnel)")).toHaveValue("Data (copie)");
    expect(screen.getByText("data analyst")).toBeInTheDocument();
    expect(screen.getByText("BI")).toBeInTheDocument();
    expect(screen.getByLabelText("Ville")).toHaveValue("Lille");
    expect(screen.getByRole("checkbox", { name: "Apprentissage" })).toBeChecked();
    // The dialog acts as a create, not an edit — no delete option for a not-yet-saved duplicate.
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
  });

  it("submits a duplicated campaign as a new campaign via createCampaign, not updateCampaign", async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockResolvedValue({
      ok: true,
      data: { campaign: { ...campaign, id: "campaign-2", slug: "alternance-data-hdf-2" } },
    });
    render(
      <CampaignsManager
        initialCampaigns={[{ ...campaign, name: "Data", keywords: ["data analyst"] }]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Dupliquer Data" }));
    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Data (copie)", keywords: ["data analyst"] })
    );
    expect(await screen.findByText("alternance-data-hdf-2")).toBeInTheDocument();
  });

  it("shows a drag handle to reorder each campaign, to the right of 'Chercher des offres' (JOB-153)", () => {
    render(<CampaignsManager initialCampaigns={[{ ...campaign, name: "Data" }]} />);

    const handle = screen.getByRole("button", { name: "Réordonner Data" });
    const search = screen.getByRole("button", { name: "Chercher des offres" });
    expect(handle).toBeInTheDocument();
    // DOM order in this row is: name/open, Dupliquer, Chercher des offres, poignée —
    // confirms the handle sits after (to the right of) the search button.
    expect(
      search.compareDocumentPosition(handle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("does not open the edit dialog when clicking the drag handle", async () => {
    const user = userEvent.setup();
    render(<CampaignsManager initialCampaigns={[campaign]} />);

    await user.click(screen.getByRole("button", { name: /Réordonner/ }));

    expect(screen.queryByText("Modifier la campagne")).not.toBeInTheDocument();
  });

  it("shows a visible error when a connector run fails, instead of a silent server-only log (JOB-64)", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    vi.mocked(triggerCampaignCollection).mockResolvedValue({
      ok: true,
      data: {
        runs: [
          { runId: "r1", rawCount: 0, normalizedCount: 0, rejectedCount: 0, filteredCount: 0, ok: false, errorMessage: "France Travail : impossible d'extraire un code postal de la localisation \"Lille\"" },
        ],
      },
    });
    render(<CampaignsManager initialCampaigns={[campaign]} />);

    await user.click(screen.getByRole("button", { name: "Chercher des offres" }));

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("code postal"));
  });
});

describe("CampaignsManager — libellé de métier (remplace le slug technique quand présent)", () => {
  it("shows the slug (technical, current behavior) when metiers is empty", () => {
    render(<CampaignsManager initialCampaigns={[{ ...campaign, name: "Ma campagne" }]} />);
    expect(screen.getByText("alternance-data-hdf")).toBeInTheDocument();
  });

  it("shows the chosen métier labels instead of the slug when metiers is set", () => {
    render(
      <CampaignsManager
        initialCampaigns={[
          { ...campaign, name: "Ma campagne", metiers: ["Data Analyst", "Data Scientist"] },
        ]}
      />
    );
    expect(screen.getByText("Data Analyst · Data Scientist")).toBeInTheDocument();
    expect(screen.queryByText("alternance-data-hdf")).not.toBeInTheDocument();
  });
});
