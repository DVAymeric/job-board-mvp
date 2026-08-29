import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders the accent variant with the positive-action tokens", () => {
    render(<Button variant="accent">Postuler</Button>);
    const button = screen.getByRole("button", { name: "Postuler" });
    expect(button).toHaveClass("bg-brand-positive", "text-brand-positive-foreground");
  });

  it("meets the 44px minimum touch target on the default size", () => {
    // a11y: le mockup impose des zones cliquables de 44px minimum (JOB-90).
    render(<Button>Enregistrer</Button>);
    expect(screen.getByRole("button", { name: "Enregistrer" })).toHaveClass("h-11");
  });

  it("meets the 44px minimum touch target on the sm size", () => {
    // size="sm" est utilisée comme action primaire dans de nombreux écrans
    // (file de revue, fiche candidature, formulaire de campagne) — pas un
    // usage compact non-tactile, donc soumise à la même exigence 44px.
    render(<Button size="sm">Ignorer</Button>);
    expect(screen.getByRole("button", { name: "Ignorer" })).toHaveClass("h-11");
  });

  it("meets the 44px minimum touch target on the lg size", () => {
    render(<Button size="lg">Continuer</Button>);
    expect(screen.getByRole("button", { name: "Continuer" })).toHaveClass("h-12");
  });

  it("meets the 44px minimum touch target on the icon size", () => {
    render(<Button size="icon" aria-label="Fermer" />);
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveClass("size-11");
  });

  it("keeps the xs size compact (excluded — usage non tactile principal)", () => {
    render(<Button size="xs">Filtrer</Button>);
    expect(screen.getByRole("button", { name: "Filtrer" })).toHaveClass("h-6");
  });

  it("keeps icon-xs compact (excluded — usage non tactile principal)", () => {
    render(<Button size="icon-xs" aria-label="Retirer" />);
    expect(screen.getByRole("button", { name: "Retirer" })).toHaveClass("size-6");
  });

  it("keeps icon-sm compact (fermeture de dialog / actions au survol desktop, pas une cible tactile principale)", () => {
    render(<Button size="icon-sm" aria-label="Éditer" />);
    expect(screen.getByRole("button", { name: "Éditer" })).toHaveClass("size-7");
  });
});
