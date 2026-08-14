import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TarifsPage from "@/app/tarifs/page";

describe("TarifsPage (JOB-127)", () => {
  it("renders a page title", () => {
    render(<TarifsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /tarifs/i })
    ).toBeInTheDocument();
  });

  it("lists exactly one tier, Gratuit, priced at 0 €", () => {
    render(<TarifsPage />);
    expect(screen.getByText("Gratuit")).toBeInTheDocument();
    expect(screen.getByText(/0\s*€/)).toBeInTheDocument();
  });

  it("links to account creation from the tier card", () => {
    // role="button" plutôt que "link" : le composant Button applique
    // volontairement une sémantique bouton même en render={<Link />}
    // (cohérence clavier/lecteur d'écran), même si l'élément DOM sous-jacent
    // reste un <a href>.
    render(<TarifsPage />);
    const link = screen.getByRole("button", { name: /créer un compte/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("uses the shared bento primitives rather than a bespoke pricing layout", () => {
    const { container } = render(<TarifsPage />);
    expect(container.querySelector('[data-slot="bento-grid"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="bento-card"]')).toBeInTheDocument();
  });
});
