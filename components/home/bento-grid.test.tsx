import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BentoGrid } from "@/components/home/bento-grid";

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
});
