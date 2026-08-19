import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Campaign } from "@prisma/client";
import { CampaignFormDialog } from "@/components/harvester/campaign-form-dialog";
import { createCampaign, updateCampaign, deleteCampaign } from "@/app/actions/campaigns";

vi.mock("@/app/actions/campaigns", () => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const existingCampaign: Campaign = {
  id: "campaign-1",
  userId: "user-1",
  slug: "data-analyst",
  romeCodes: ["M1403", "M1805"],
  keywords: ["data analyst"],
  contractTypes: ["APPRENTISSAGE"],
  schedule: "0 7 * * *",
  config: {
    locations: [{ label: "Lille", lat: 50.630951, lng: 3.045391, radiusKm: 30 }],
    targets: { workday: [{ tenant: "valeo", site: "valeo_jobs", dc: "wd3" }], smartrecruiters: ["MAZARS"] },
  },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.mocked(createCampaign).mockReset();
  vi.mocked(updateCampaign).mockReset();
  vi.mocked(deleteCampaign).mockReset();
});

describe("CampaignFormDialog — création", () => {
  it("renders as a dialog with a create title", () => {
    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Nouvelle campagne")).toBeInTheDocument();
  });

  it("does not ask for an identifier or ROME codes — keywords and a city are enough", () => {
    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("Identifiant")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Codes ROME")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Longitude")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ville")).toBeInTheDocument();
  });

  it("disables the submit button until at least one contract type is set", async () => {
    const user = userEvent.setup();
    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Créer la campagne" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    expect(screen.getByRole("button", { name: "Créer la campagne" })).not.toBeDisabled();
  });

  it(
    "submits a campaign with comma-separated keywords and a city label, and calls onCreated",
    async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });
    const onCreated = vi.fn();

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={onCreated}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Mots-clés"), "développeur web, full-stack");
    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    await user.type(screen.getByLabelText("Ville"), "Lille");

    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: ["développeur web", "full-stack"],
        contractTypes: ["APPRENTISSAGE"],
        locations: [{ label: "Lille", radiusKm: 30 }],
        targets: undefined,
      })
    );
    expect(onCreated).toHaveBeenCalledWith(existingCampaign);
    },
    10000
  );

  it(
    "shows an error toast and does not call onCreated when the action fails",
    async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockResolvedValue({
      ok: false,
      error: "Ville introuvable : « Villeinexistante »",
      code: "VALIDATION_ERROR",
    });
    const onCreated = vi.fn();

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={onCreated}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    await user.type(screen.getByLabelText("Ville"), "Villeinexistante");
    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(onCreated).not.toHaveBeenCalled();
    },
    10000
  );
});

describe("CampaignFormDialog — édition", () => {
  it("pre-fills every field from the existing campaign, including config-derived locations and targets", () => {
    render(
      <CampaignFormDialog
        campaign={existingCampaign}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Modifier la campagne")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Apprentissage" })).toBeChecked();
    expect(screen.getByLabelText("Ville")).toHaveValue("Lille");
    expect(screen.getByLabelText("Tenant Workday")).toHaveValue("valeo");
    expect(screen.getByLabelText("Cibles SmartRecruiters (optionnel)")).toHaveValue("MAZARS");
  });

  it("calls updateCampaign with the campaignId (no slug) and calls onUpdated on success", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });
    const onUpdated = vi.fn();

    render(
      <CampaignFormDialog
        campaign={existingCampaign}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ campaignId: "campaign-1", locations: [{ label: "Lille", radiusKm: 30 }] })
    );
    expect(updateCampaign).toHaveBeenCalledWith(expect.not.objectContaining({ slug: expect.anything() }));
    expect(onUpdated).toHaveBeenCalledWith(existingCampaign);
  });

  it("requires explicit confirmation before deleting", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteCampaign).mockResolvedValue({ ok: true, data: null });
    const onDeleted = vi.fn();

    render(
      <CampaignFormDialog
        campaign={existingCampaign}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(deleteCampaign).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(deleteCampaign).toHaveBeenCalledWith({ campaignId: "campaign-1" });
    expect(onDeleted).toHaveBeenCalledWith("campaign-1");
  });
});
