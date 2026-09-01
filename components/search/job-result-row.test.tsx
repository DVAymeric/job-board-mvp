import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobResultRow, type JobResult } from "@/components/search/job-result-row";

const baseResult: JobResult = {
  id: "offer-1",
  title: "Chargé·e de recrutement",
  companyName: "Atelier Nova",
  companyLogoUrl: null,
  location: "Reims (51)",
  publishedAt: new Date("2026-09-02"),
  contractType: "CDI",
  tags: ["Hybride"],
  beginnerFriendly: false,
  applyUrl: "https://example.com/offre/1",
};

describe("JobResultRow", () => {
  it("renders title, company, location and the accent Postuler CTA", () => {
    render(<JobResultRow result={baseResult} />);
    expect(screen.getByText("Chargé·e de recrutement")).toBeInTheDocument();
    expect(screen.getByText(/Atelier Nova/)).toBeInTheDocument();
    expect(screen.getByText(/Reims \(51\)/)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /postuler/i });
    expect(cta.className).toMatch(/bg-brand-positive/);
  });

  it("shows the published date spelled out, never in DD/MM digit format", () => {
    render(<JobResultRow result={baseResult} />);
    expect(screen.queryByText(/\b02\/09\/2026\b/)).not.toBeInTheDocument();
  });

  it('shows an explicit "Débutant accepté" mention when beginnerFriendly is true', () => {
    render(<JobResultRow result={{ ...baseResult, tags: [], beginnerFriendly: true }} />);
    expect(screen.getByText(/Débutant accepté/i)).toBeInTheDocument();
  });

  it('does not show the "Débutant accepté" mention when beginnerFriendly is false', () => {
    render(<JobResultRow result={baseResult} />);
    expect(screen.queryByText(/Débutant accepté/i)).not.toBeInTheDocument();
  });

  it("renders each tag as a tag-variant badge", () => {
    render(<JobResultRow result={{ ...baseResult, tags: ["Hybride", "CDI"] }} />);
    const badge = screen.getByText("Hybride");
    expect(badge).toHaveAttribute("data-variant", "tag");
  });

  it("the Postuler CTA opens the apply URL in a new tab safely", async () => {
    render(<JobResultRow result={baseResult} />);
    const cta = screen.getByRole("link", { name: /postuler/i });
    expect(cta).toHaveAttribute("href", baseResult.applyUrl);
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("guarantees the Postuler CTA a 44px touch target (JOB-90, audited in JOB-145)", () => {
    render(<JobResultRow result={baseResult} />);
    const cta = screen.getByRole("link", { name: /postuler/i });
    expect(cta.className).toMatch(/\bh-11\b/);
  });

  it("shows only the contract type plus one secondary tag by default, to avoid overloading the card (JOB-145)", () => {
    render(<JobResultRow result={{ ...baseResult, tags: ["Hybride", "Temps partiel"], beginnerFriendly: true }} />);

    expect(screen.getByText("CDI")).toBeInTheDocument();
    expect(screen.getByText("Hybride")).toBeInTheDocument();
    expect(screen.queryByText("Temps partiel")).not.toBeInTheDocument();
    expect(screen.queryByText("Débutant accepté")).not.toBeInTheDocument();
  });

  it("summarizes the hidden extra tags in a '+N' badge with an accessible label listing them", () => {
    render(<JobResultRow result={{ ...baseResult, tags: ["Hybride", "Temps partiel"], beginnerFriendly: true }} />);

    const more = screen.getByText("+2");
    expect(more).toHaveAttribute(
      "aria-label",
      "Et 2 de plus : Temps partiel, Débutant accepté"
    );
  });

  it("does not show a '+N' badge when there is at most one secondary tag", () => {
    render(<JobResultRow result={baseResult} />);
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it("signals interactivity on hover without relying on it alone (JOB-114)", () => {
    render(<JobResultRow result={baseResult} />);
    // JOB-109 : le conteneur passe de `flex items-center` (une seule ligne)
    // à `flex flex-col ... md:flex-row md:items-center` (empilé sous
    // `md:`) — `items-center` n'est donc plus un token littéral toujours
    // présent. `border-b` reste la classe stable du conteneur de ligne à
    // toutes les tailles d'écran.
    const row = screen.getByText("Chargé·e de recrutement").closest("div.border-b");
    expect(row?.className).toMatch(/hover:bg-muted/);
  });
});
