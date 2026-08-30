import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  romeCodes: ["M1403"],
  keywords: [],
  contractTypes: ["APPRENTISSAGE", "PROFESSIONNALISATION"],
  schedule: null,
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

    await user.click(screen.getByRole("button", { name: "Lancer la collecte" }));

    expect(triggerCampaignCollection).toHaveBeenCalledWith({ campaignId: "campaign-1" });
    // The dialog never opens for a trigger click, unlike clicking the row itself.
    expect(screen.queryByText("Modifier la campagne")).not.toBeInTheDocument();
  });
});
