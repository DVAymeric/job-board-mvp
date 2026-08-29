import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectorBadge } from "@/components/ui/connector-badge";

describe("ConnectorBadge", () => {
  it("renders the connector label as text", () => {
    render(<ConnectorBadge label="France Travail" active />);
    expect(screen.getByText("France Travail")).toBeInTheDocument();
  });

  it("renders optional meta text alongside the label", () => {
    render(<ConnectorBadge label="Workday" active meta="128 offres" />);
    expect(screen.getByText("128 offres")).toBeInTheDocument();
  });

  it("uses a motion-safe pulse animation on the dot when active, never a bare color-only signal", () => {
    const { container } = render(<ConnectorBadge label="France Travail" active />);
    const dot = container.querySelector('[data-testid="connector-dot"]');
    expect(dot).toHaveClass("bg-brand-positive", "motion-safe:animate-pulse");
  });

  it("does not animate when inactive, and uses a distinct static color", () => {
    const { container } = render(<ConnectorBadge label="Workday" active={false} />);
    const dot = container.querySelector('[data-testid="connector-dot"]');
    expect(dot).not.toHaveClass("motion-safe:animate-pulse");
    expect(dot).toHaveClass("bg-destructive");
  });

  it("carries the active/inactive information through text too, never color/animation alone", () => {
    render(<ConnectorBadge label="France Travail" active />);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it("marks the dot as decorative for screen readers", () => {
    const { container } = render(<ConnectorBadge label="France Travail" active />);
    const dot = container.querySelector('[data-testid="connector-dot"]');
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });
});
