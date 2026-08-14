import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BentoCard } from "@/components/ui/bento-card";

describe("BentoCard", () => {
  it("renders the title and label", () => {
    render(<BentoCard label="Board" title="Kanban drag & drop" />);
    expect(screen.getByText("Kanban drag & drop")).toBeInTheDocument();
    expect(screen.getByText("Board")).toBeInTheDocument();
  });

  it("omits the label when none is given", () => {
    render(<BentoCard title="100% local" />);
    expect(screen.queryByText("Board")).not.toBeInTheDocument();
  });

  it("allows the grid item to shrink below its content's intrinsic width", () => {
    // Without min-w-0, a wide-content child (e.g. the 53-week heatmap) forces
    // this grid item — and the whole grid/page — wider than the viewport
    // instead of scrolling within its own overflow-x-auto container.
    render(<BentoCard title="Fréquence de candidature" />);
    const card = screen
      .getByText("Fréquence de candidature")
      .closest('[data-slot="bento-card"]');
    expect(card).toHaveClass("min-w-0");
  });

  it("also lets the body wrapper (a flex item of the card itself) shrink", () => {
    // BentoCard is itself flex-col, so its children wrapper is a flex item
    // subject to the same min-width:auto trap one level down.
    render(
      <BentoCard title="Fréquence de candidature">
        <p>contenu</p>
      </BentoCard>
    );
    const bodyWrapper = screen.getByText("contenu").parentElement;
    expect(bodyWrapper).toHaveClass("min-w-0");
  });

  it("renders children as body content", () => {
    render(
      <BentoCard title="Confidentialité">
        <p>SQLite sur votre machine.</p>
      </BentoCard>
    );
    expect(screen.getByText("SQLite sur votre machine.")).toBeInTheDocument();
  });

  it("defaults to a 1x1 span and default tone", () => {
    render(<BentoCard title="Contacts" />);
    const card = screen.getByText("Contacts").closest('[data-slot="bento-card"]');
    expect(card).toHaveClass("col-span-1", "row-span-1");
    expect(card).toHaveAttribute("data-tone", "default");
  });

  it.each([
    ["1x1", ["col-span-1", "row-span-1"]],
    ["2x1", ["col-span-2", "row-span-1"]],
    ["1x2", ["col-span-1", "row-span-2"]],
    ["2x2", ["col-span-2", "row-span-2"]],
    ["4x1", ["col-span-2", "row-span-1", "md:col-span-4"]],
  ] as const)("applies the %s span classes", (span, expectedClasses) => {
    render(<BentoCard title="Carte" span={span} />);
    const card = screen.getByText("Carte").closest('[data-slot="bento-card"]');
    expectedClasses.forEach((cls) => expect(card).toHaveClass(cls));
  });

  it.each(["default", "dark", "accent", "muted"] as const)(
    "exposes the %s tone via data-tone",
    (tone) => {
      render(<BentoCard title="Carte" tone={tone} />);
      const card = screen.getByText("Carte").closest('[data-slot="bento-card"]');
      expect(card).toHaveAttribute("data-tone", tone);
    }
  );

  it("uses a fixed light lilac background and fixed dark text for the muted tone", () => {
    // The muted tone (light lilac) doesn't invert in dark mode, so its text
    // can't rely on theme-aware tokens like text-heading (which flips to a
    // light color in .dark and becomes unreadable on this fixed light bg).
    // Both sides use the dark-mode-invariant --palette-* tokens (JOB-101)
    // rather than raw hex literals.
    render(<BentoCard title="Relance" tone="muted" />);
    const title = screen.getByText("Relance", { selector: "h3" });
    const card = title.closest('[data-slot="bento-card"]');
    expect(card).toHaveClass("bg-palette-brume");
    expect(title).not.toHaveClass("text-heading");
    expect(title).toHaveClass("text-palette-nuit");
  });

  it("omits the h3 entirely when no title is given", () => {
    const { container } = render(
      <BentoCard label="Vue d'ensemble">
        <p>5 candidatures suivies au total</p>
      </BentoCard>
    );
    expect(container.querySelector("h3")).not.toBeInTheDocument();
    expect(screen.getByText("5 candidatures suivies au total")).toBeInTheDocument();
  });

  it("merges bodyClassName onto the children wrapper for custom body layouts", () => {
    render(
      <BentoCard title="Détail par statut" bodyClassName="flex divide-x">
        <span>À postuler</span>
        <span>Postulé</span>
      </BentoCard>
    );
    const bodyWrapper = screen.getByText("À postuler").parentElement;
    expect(bodyWrapper).toHaveClass("flex", "divide-x");
  });
});
