import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferSearch, type SearchableOffer } from "@/components/search/offer-search";

function makeOffer(overrides: Partial<SearchableOffer["result"]> & { rawContractType?: string } = {}): SearchableOffer {
  const { rawContractType, ...resultOverrides } = overrides;
  const result = {
    id: "offer-1",
    title: "Chargé·e de recrutement",
    companyName: "Atelier Nova",
    companyLogoUrl: null,
    location: "Reims (51)",
    publishedAt: new Date("2026-09-02"),
    contractType: "Apprentissage",
    tags: [],
    beginnerFriendly: false,
    applyUrl: "https://example.com/offre/1",
    ...resultOverrides,
  };
  return {
    result,
    keywordHaystack: `${result.title} ${result.companyName}`.toLowerCase(),
    locationHaystack: result.location.toLowerCase(),
    rawContractType: rawContractType ?? "APPRENTISSAGE",
  };
}

describe("OfferSearch", () => {
  it("shows all offers before any search is submitted", () => {
    render(
      <OfferSearch
        offers={[
          makeOffer({ id: "1", title: "Chargé de recrutement" }),
          makeOffer({ id: "2", title: "Développeur frontend" }),
        ]}
      />,
    );
    expect(screen.getByText("Chargé de recrutement")).toBeInTheDocument();
    expect(screen.getByText("Développeur frontend")).toBeInTheDocument();
  });

  it("filters by keyword across title and company, case-insensitively", async () => {
    const user = userEvent.setup();
    render(
      <OfferSearch
        offers={[
          makeOffer({ id: "1", title: "Chargé de recrutement", companyName: "Atelier Nova" }),
          makeOffer({ id: "2", title: "Développeur frontend", companyName: "Nexora" }),
        ]}
      />,
    );

    await user.type(screen.getByLabelText(/métier|mot-clé/i), "développeur");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(screen.queryByText("Chargé de recrutement")).not.toBeInTheDocument();
    expect(screen.getByText("Développeur frontend")).toBeInTheDocument();
  });

  it("filters by location, case-insensitively", async () => {
    const user = userEvent.setup();
    render(
      <OfferSearch
        offers={[
          makeOffer({ id: "1", title: "Offre Reims", location: "Reims (51)" }),
          makeOffer({ id: "2", title: "Offre Paris", location: "Paris (75)" }),
        ]}
      />,
    );

    await user.type(screen.getByLabelText(/ville|code postal/i), "reims");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(screen.getByText("Offre Reims")).toBeInTheDocument();
    expect(screen.queryByText("Offre Paris")).not.toBeInTheDocument();
  });

  it("filters by contract type using the raw enum value, not the displayed French label", async () => {
    const user = userEvent.setup();
    render(
      <OfferSearch
        offers={[
          makeOffer({ id: "1", title: "Offre stage", rawContractType: "STAGE" }),
          makeOffer({ id: "2", title: "Offre apprentissage", rawContractType: "APPRENTISSAGE" }),
        ]}
      />,
    );

    await user.click(screen.getByLabelText(/type de contrat/i));
    await user.click(await screen.findByRole("option", { name: /stage/i }));
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(screen.getByText("Offre stage")).toBeInTheDocument();
    expect(screen.queryByText("Offre apprentissage")).not.toBeInTheDocument();
  });

  it("shows a clear empty-state message when no offer matches the search", async () => {
    const user = userEvent.setup();
    render(<OfferSearch offers={[makeOffer({ id: "1", title: "Offre Reims" })]} />);

    await user.type(screen.getByLabelText(/métier|mot-clé/i), "introuvable-xyz");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(screen.queryByText("Offre Reims")).not.toBeInTheDocument();
    expect(screen.getByText(/aucune offre ne correspond/i)).toBeInTheDocument();
  });

  it("shows the empty-state message immediately when there are no offers at all", () => {
    render(<OfferSearch offers={[]} />);
    expect(screen.getByText(/aucune offre ne correspond/i)).toBeInTheDocument();
  });
});

describe("OfferSearch — erreur de chargement côté serveur (JOB-116)", () => {
  it("shows a clear, non-technical inline error instead of the results list when loading failed", () => {
    render(
      <OfferSearch
        offers={[]}
        loadError="Impossible de charger vos offres pour le moment. Réessayez dans quelques instants."
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/impossible de charger vos offres/i);
    expect(screen.queryByText(/aucune offre ne correspond/i)).not.toBeInTheDocument();
  });

  it("keeps the search form mounted and usable, without discarding criteria already typed", async () => {
    const user = userEvent.setup();
    render(
      <OfferSearch
        offers={[]}
        loadError="Impossible de charger vos offres pour le moment. Réessayez dans quelques instants."
      />
    );

    const keywordInput = screen.getByLabelText(/métier|mot-clé/i);
    await user.type(keywordInput, "développeur");

    expect(keywordInput).toHaveValue("développeur");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("moves focus to the error message so it is announced", () => {
    render(
      <OfferSearch
        offers={[]}
        loadError="Impossible de charger vos offres pour le moment. Réessayez dans quelques instants."
      />
    );

    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("does not show the load error banner when there is no load error", () => {
    render(<OfferSearch offers={[]} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("OfferSearch — visiteur anonyme (JOB-138)", () => {
  it("shows an explicit sign-up message instead of the silent empty state when signed out", () => {
    render(<OfferSearch offers={[]} signedOut />);

    expect(screen.getByTestId("offer-search-signed-out")).toBeInTheDocument();
    expect(screen.queryByText(/aucune offre ne correspond/i)).not.toBeInTheDocument();
  });

  it("offers clear actions to create an account or log in", () => {
    render(<OfferSearch offers={[]} signedOut />);

    expect(screen.getByRole("button", { name: /créer un compte gratuit/i })).toHaveAttribute(
      "href",
      "/register"
    );
    expect(screen.getByRole("button", { name: /se connecter/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("keeps the search form mounted and usable for a signed-out visitor", async () => {
    const user = userEvent.setup();
    render(<OfferSearch offers={[]} signedOut />);

    const keywordInput = screen.getByLabelText(/métier|mot-clé/i);
    await user.type(keywordInput, "développeur");

    expect(keywordInput).toHaveValue("développeur");
  });

  it("prioritizes the signed-out message over a load error or results, if both were somehow passed", () => {
    render(
      <OfferSearch
        offers={[]}
        loadError="Impossible de charger vos offres pour le moment. Réessayez dans quelques instants."
        signedOut
      />
    );

    expect(screen.getByTestId("offer-search-signed-out")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show the signed-out message for an authenticated visitor", () => {
    render(<OfferSearch offers={[]} />);
    expect(screen.queryByTestId("offer-search-signed-out")).not.toBeInTheDocument();
  });
});

describe("OfferSearch — critères pré-remplis depuis la hero (JOB-139)", () => {
  it("applies the initial criteria immediately, without requiring a new submission", () => {
    render(
      <OfferSearch
        offers={[
          makeOffer({ id: "1", title: "Chargé de recrutement" }),
          makeOffer({ id: "2", title: "Développeur frontend" }),
        ]}
        initialCriteria={{ keyword: "développeur", location: "", contractType: "" }}
      />
    );

    expect(screen.queryByText("Chargé de recrutement")).not.toBeInTheDocument();
    expect(screen.getByText("Développeur frontend")).toBeInTheDocument();
  });

  it("pre-fills the search form fields from the initial criteria", () => {
    render(
      <OfferSearch
        offers={[]}
        initialCriteria={{ keyword: "développeur", location: "Reims", contractType: "" }}
      />
    );

    expect(screen.getByLabelText(/métier|mot-clé/i)).toHaveValue("développeur");
    expect(screen.getByLabelText(/ville|code postal/i)).toHaveValue("Reims");
  });
});

describe("OfferSearch — annonce des résultats pour les lecteurs d'écran (JOB-145)", () => {
  it("wraps the results area in a polite live region, so a filter change is announced without a focus change", () => {
    render(<OfferSearch offers={[]} />);
    const liveRegion = screen.getByText(/aucune offre ne correspond/i).closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
