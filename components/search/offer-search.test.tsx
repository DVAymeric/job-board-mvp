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
