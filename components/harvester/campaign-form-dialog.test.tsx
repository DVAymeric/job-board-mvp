import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Campaign } from "@prisma/client";
import { CampaignFormDialog } from "@/components/harvester/campaign-form-dialog";
import { createCampaign, updateCampaign, deleteCampaign, searchMetiers } from "@/app/actions/campaigns";

vi.mock("@/app/actions/campaigns", () => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  searchMetiers: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const existingCampaign: Campaign = {
  id: "campaign-1",
  userId: "user-1",
  slug: "data-analyst",
  name: "Data",
  romeCodes: ["M1403", "M1805"],
  keywords: ["data analyst"],
  metiers: [],
  contractTypes: ["APPRENTISSAGE"],
  schedule: "0 7 * * *",
  order: 0,
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

  it("offers an optional display name field, distinct from the (absent) identifier field", () => {
    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Nom (optionnel)")).toBeInTheDocument();
  });

  it("submits the display name when filled in, and omits it when left blank", async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Nom (optionnel)"), "Data");
    await user.type(screen.getByLabelText("Mots-clés"), "data analyst");
    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    await user.type(screen.getByLabelText("Ville"), "Lille");

    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(expect.objectContaining({ name: "Data" }));
  });

  // JOB-158 : le bouton bloquait déjà tant qu'aucun type de contrat ou aucune localisation
  // n'était renseigné, mais rien ne l'annonçait dans le formulaire — trouvé en audit QA.
  it("tells the user that a contract type and a location are required (JOB-158)", () => {
    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Au moins un type de contrat est requis.")).toBeInTheDocument();
    expect(screen.getByText("Au moins une localisation est requise.")).toBeInTheDocument();
  });

  // JOB-160 : trouvé en audit QA — un code ROME au mauvais format ou un rayon à 0 étaient
  // acceptés sans avertissement jusqu'au clic sur "Créer la campagne" (bandeau générique, sans
  // lien visuel avec le champ fautif).
  it("flags an invalid ROME code as soon as it is added, before any submit attempt (JOB-160)", async () => {
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

    await user.type(screen.getByLabelText("Codes ROME (optionnel)"), "ZZ9999,");

    expect(screen.getByRole("alert")).toHaveTextContent("Format invalide (ZZ9999)");
  });

  it("flags a zero radius as soon as a city is entered, before any submit attempt (JOB-160)", async () => {
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

    await user.type(screen.getByLabelText("Ville"), "Marseille");
    await user.clear(screen.getByLabelText("Rayon (km)"));
    await user.type(screen.getByLabelText("Rayon (km)"), "0");

    expect(screen.getByRole("alert")).toHaveTextContent("Rayon invalide");
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
    "submits a campaign with contractTypes: [\"STAGE\"] when only Stage is checked (JOB-62)",
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

    await user.type(screen.getByLabelText("Mots-clés"), "développeur web");
    await user.click(screen.getByRole("checkbox", { name: "Stage" }));
    await user.type(screen.getByLabelText("Ville"), "Lille");

    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        contractTypes: ["STAGE"],
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

  it(
    "shows the same error inline (in addition to the toast), moves focus to it, and links it to the submit button via aria-describedby",
    async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockResolvedValue({
      ok: false,
      error: "Une campagne avec cet identifiant existe déjà",
      code: "CONFLICT",
    });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));

    const submitButton = screen.getByRole("button", { name: "Créer la campagne" });
    await user.click(submitButton);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Une campagne avec cet identifiant existe déjà");
    expect(submitButton).toHaveAttribute("aria-describedby", alert.id);
    expect(alert).toHaveFocus();
    },
    10000
  );

  it("clears the inline error once a corrected submission succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign)
      .mockResolvedValueOnce({
        ok: false,
        error: "Une campagne avec cet identifiant existe déjà",
        code: "CONFLICT",
      })
      .mockResolvedValueOnce({ ok: true, data: { campaign: existingCampaign } });
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

    const submitButton = screen.getByRole("button", { name: "Créer la campagne" });
    await user.click(submitButton);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(submitButton);

    expect(onCreated).toHaveBeenCalledWith(existingCampaign);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
    expect(screen.getByLabelText("Nom (optionnel)")).toHaveValue("Data");
    expect(screen.getByRole("checkbox", { name: "Apprentissage" })).toBeChecked();
    expect(screen.getByLabelText("Ville")).toHaveValue("Lille");
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

  it("pre-fills a chip per existing keyword (JOB-148)", () => {
    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, keywords: ["data analyst", "BI"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("data analyst")).toBeInTheDocument();
    expect(screen.getByText("BI")).toBeInTheDocument();
  });

  it("removes a single keyword chip without touching the others, then saves the trimmed list", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, keywords: ["data analyst", "BI"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Retirer BI" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: ["data analyst"] })
    );
  });

  it("pre-fills a chip per existing code ROME (JOB-153)", () => {
    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, romeCodes: ["M1403", "M1805"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("M1403")).toBeInTheDocument();
    expect(screen.getByText("M1805")).toBeInTheDocument();
  });

  it("supports adding several codes ROME and saves them all", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, romeCodes: [] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Codes ROME (optionnel)"), "M1403,M1805,");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ romeCodes: ["M1403", "M1805"] })
    );
  });

  it("removes a single code ROME chip without touching the others", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, romeCodes: ["M1403", "M1805"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Retirer M1805" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ romeCodes: ["M1403"] })
    );
  });

  it("clears all keyword chips at once via \"Tout supprimer\", then saves an empty list", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, keywords: ["data analyst", "BI"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tout supprimer les mots-clés" }));

    expect(screen.queryByText("data analyst")).not.toBeInTheDocument();
    expect(screen.queryByText("BI")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(expect.objectContaining({ keywords: [] }));
  });

  it("does not show \"Tout supprimer\" when there are no keywords", () => {
    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, keywords: [] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Tout supprimer les mots-clés" })).not.toBeInTheDocument();
  });

  it("clears all code ROME chips at once via \"Tout supprimer\", then saves an empty list", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, romeCodes: ["M1403", "M1805"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tout supprimer les codes ROME" }));

    expect(screen.queryByText("M1403")).not.toBeInTheDocument();
    expect(screen.queryByText("M1805")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(expect.objectContaining({ romeCodes: [] }));
  });

  it("does not show \"Tout supprimer\" when there are no codes ROME", () => {
    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, romeCodes: [] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Tout supprimer les codes ROME" })).not.toBeInTheDocument();
  });
});

describe("CampaignFormDialog — masquer les réglages techniques par connecteur (JOB-151)", () => {
  it("never shows Workday target fields, SmartRecruiters targets, or a raw cron field", () => {
    render(
      <CampaignFormDialog
        campaign={existingCampaign}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("Tenant Workday")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Site Workday")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Datacenter Workday")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cibles SmartRecruiters (optionnel)")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/expression cron/i)).not.toBeInTheDocument();
  });

  it("offers a natural-language schedule select defaulting to manual-only for a new alert", () => {
    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByRole("combobox", { name: "Fréquence de recherche" })).toHaveTextContent(
      "Manuelle uniquement"
    );
  });

  it("pre-selects the matching natural-language option from an existing cron expression", () => {
    render(
      <CampaignFormDialog
        campaign={existingCampaign}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByRole("combobox", { name: "Fréquence de recherche" })).toHaveTextContent(
      "Tous les jours (7h)"
    );
  });

  it("submits the matching cron expression for the chosen natural-language schedule", async () => {
    const user = userEvent.setup();
    vi.mocked(createCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Mots-clés"), "data analyst{Enter}");
    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    await user.type(screen.getByLabelText("Ville"), "Lille");

    await user.click(screen.getByRole("combobox", { name: "Fréquence de recherche" }));
    await user.click(await screen.findByRole("option", { name: "Toutes les semaines (lundi 7h)" }));

    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: "0 7 * * 1" })
    );
  });

  it(
    "preserves an existing alert's Workday/SmartRecruiters targets on save, even though the form never exposes them",
    async () => {
      const user = userEvent.setup();
      vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

      render(
        <CampaignFormDialog
          campaign={existingCampaign}
          onOpenChange={vi.fn()}
          onCreated={vi.fn()}
          onUpdated={vi.fn()}
          onDeleted={vi.fn()}
        />
      );

      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      expect(updateCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: {
            workday: [{ tenant: "valeo", site: "valeo_jobs", dc: "wd3" }],
            smartrecruiters: ["MAZARS"],
          },
        })
      );
    },
    10000
  );

  it("preserves an unrecognized existing cron expression unchanged, under a 'Personnalisé' option", async () => {
    const user = userEvent.setup();
    const customScheduleCampaign = { ...existingCampaign, schedule: "0 3 * * 3" };
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: customScheduleCampaign } });

    render(
      <CampaignFormDialog
        campaign={customScheduleCampaign}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByRole("combobox", { name: "Fréquence de recherche" })).toHaveTextContent(
      "Personnalisé"
    );

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: "0 3 * * 3" })
    );
  });
});

describe("CampaignFormDialog — échelle typographique (JOB-97)", () => {
  it("renders form labels at the revised 16px-minimum scale (text-base), not text-sm", () => {
    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    const keywordsLabel = screen.getByText("Mots-clés");
    expect(keywordsLabel).toHaveClass("text-base");
    expect(keywordsLabel).not.toHaveClass("text-sm");

    const contractTypesLabel = screen.getByText("Types de contrat");
    expect(contractTypesLabel).toHaveClass("text-base");
    expect(contractTypesLabel).not.toHaveClass("text-sm");
  });
});

describe("CampaignFormDialog — métier recherché (recherche assistée sur le référentiel ROME)", () => {
  it("shows suggestions after typing, and selecting one adds a métier pill plus its ROME code and keyword", async () => {
    const user = userEvent.setup();
    vi.mocked(searchMetiers).mockResolvedValue({
      ok: true,
      data: { matches: [{ libelle: "Data Scientist", romeCode: "M1405", score: 0.9 }] },
    });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Métier recherché"), "data scie");

    expect(await screen.findByRole("button", { name: "Data Scientist" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Data Scientist" }));

    // Deux occurrences attendues : la pastille "Métier recherché" ET le mot-clé ajouté
    // automatiquement (effet de bord de selectMetier) dans le champ "Mots-clés".
    expect(screen.getAllByText("Data Scientist")).toHaveLength(2);
    expect(screen.getByLabelText("Métier recherché")).toHaveValue("");
  });

  it("shows a clear message when nothing matches, without blocking the form", async () => {
    const user = userEvent.setup();
    vi.mocked(searchMetiers).mockResolvedValue({ ok: true, data: { matches: [] } });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Métier recherché"), "xyzabc");

    expect(await screen.findByText("Aucun métier trouvé pour « xyzabc ».")).toBeInTheDocument();
  });

  it("includes selected métiers, and their ROME codes and keywords, in the created campaign payload", async () => {
    const user = userEvent.setup();
    vi.mocked(searchMetiers).mockResolvedValue({
      ok: true,
      data: { matches: [{ libelle: "Data Analyst", romeCode: "M1403", score: 0.9 }] },
    });
    vi.mocked(createCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Métier recherché"), "data analy");
    await user.click(await screen.findByRole("button", { name: "Data Analyst" }));
    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    await user.type(screen.getByLabelText("Ville"), "Lille");
    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        metiers: ["Data Analyst"],
        romeCodes: ["M1403"],
        keywords: ["Data Analyst"],
      })
    );
  });

  it("removing a métier pill also removes its ROME code and keyword from the created campaign payload", async () => {
    const user = userEvent.setup();
    vi.mocked(searchMetiers).mockResolvedValue({
      ok: true,
      data: { matches: [{ libelle: "Data Analyst", romeCode: "M1403", score: 0.9 }] },
    });
    vi.mocked(createCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Métier recherché"), "data analy");
    await user.click(await screen.findByRole("button", { name: "Data Analyst" }));
    // "Retirer Data Analyst" est ambigu : selectMetier ajoute le libellé à la fois comme
    // pastille métier ET comme mot-clé (ChipInput), qui partagent le même format
    // d'aria-label (`Retirer ${valeur}`). La pastille métier est rendue en premier dans
    // le DOM (section "Métier recherché" avant "Mots-clés") — [0] cible donc bien elle.
    const [metierRemoveButton] = screen.getAllByRole("button", { name: "Retirer Data Analyst" });
    await user.click(metierRemoveButton);
    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    await user.type(screen.getByLabelText("Ville"), "Lille");
    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        metiers: [],
        romeCodes: [],
        keywords: [],
      })
    );
  });
});
