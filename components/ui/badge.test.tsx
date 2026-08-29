import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge — variant tag", () => {
  it("renders with the pill-bg/brand tokens and rounded-full shape", () => {
    render(<Badge variant="tag">CDI</Badge>);
    const badge = screen.getByText("CDI");
    expect(badge.closest('[data-slot="badge"]')).toHaveClass(
      "bg-pill-bg",
      "text-primary"
    );
  });

  it("follows the revised typography scale — text-sm minimum, not text-xs", () => {
    render(<Badge variant="tag">Hybride</Badge>);
    const badge = screen.getByText("Hybride").closest('[data-slot="badge"]');
    expect(badge).toHaveClass("text-sm");
    expect(badge).not.toHaveClass("text-xs");
  });

  it("accepts an additional className without dropping the tag tokens", () => {
    render(
      <Badge variant="tag" className="mt-1">
        Alternance
      </Badge>
    );
    const badge = screen.getByText("Alternance").closest('[data-slot="badge"]');
    expect(badge).toHaveClass("mt-1", "bg-pill-bg");
  });
});

describe("Badge — variant contract (JOB-124)", () => {
  it("renders with dedicated contract-bg/contract-fg tokens, distinct from tag and status tokens", () => {
    render(<Badge variant="contract">CDI</Badge>);
    const badge = screen.getByText("CDI").closest('[data-slot="badge"]');
    expect(badge).toHaveClass("bg-contract-bg", "text-contract-fg");
    expect(badge?.className).not.toMatch(/bg-pill-bg|bg-status-/);
  });

  it("follows the revised typography scale — text-sm minimum, not text-xs", () => {
    render(<Badge variant="contract">Alternance</Badge>);
    const badge = screen.getByText("Alternance").closest('[data-slot="badge"]');
    expect(badge).toHaveClass("text-sm");
    expect(badge).not.toHaveClass("text-xs");
  });
});
