import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BentoGrid } from "@/components/ui/bento-grid";

describe("BentoGrid", () => {
  it("renders its children inside a grid container", () => {
    render(
      <BentoGrid>
        <div>Carte A</div>
        <div>Carte B</div>
      </BentoGrid>
    );
    expect(screen.getByText("Carte A")).toBeInTheDocument();
    expect(screen.getByText("Carte B")).toBeInTheDocument();
  });

  it("uses 2 columns by default and 4 columns from the md breakpoint", () => {
    render(
      <BentoGrid>
        <div>Carte A</div>
      </BentoGrid>
    );
    const grid = screen.getByText("Carte A").closest('[data-slot="bento-grid"]');
    expect(grid).toHaveClass("grid-cols-2", "md:grid-cols-4");
  });

  it("lets rows grow past the target tile height instead of clipping content (JOB-110)", () => {
    render(
      <BentoGrid>
        <div>Carte A</div>
      </BentoGrid>
    );
    const grid = screen.getByText("Carte A").closest('[data-slot="bento-grid"]');
    // minmax(min, auto), pas une hauteur figée : sous le seuil où une
    // colonne devient trop étroite pour son contenu (label + valeur +
    // phrase de contexte), la ligne doit pouvoir s'agrandir plutôt que de
    // tronquer le texte via l'overflow-hidden de BentoCard.
    expect(grid).toHaveClass(
      "[grid-auto-rows:minmax(140px,auto)]",
      "md:[grid-auto-rows:minmax(150px,auto)]"
    );
  });
});
