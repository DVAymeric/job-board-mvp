import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BentoCard } from "@/components/home/bento-card";

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
    render(<BentoCard title="Relance" tone="muted" />);
    const title = screen.getByText("Relance", { selector: "h3" });
    const card = title.closest('[data-slot="bento-card"]');
    expect(card).toHaveClass("bg-[#c8c6d7]");
    expect(title).not.toHaveClass("text-heading");
    expect(title.className).toMatch(/text-\[#/);
  });
});
