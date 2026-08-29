import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders with the skeleton data-slot", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it("is decorative (aria-hidden) so screen readers don't announce it directly — the caller's container carries the accessible loading state", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('[data-slot="skeleton"]')).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("defaults to shape=rect with rounded-lg and a muted background", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el).toHaveClass("rounded-lg", "bg-muted");
  });

  it("shape=circle renders fully rounded", () => {
    const { container } = render(<Skeleton shape="circle" />);
    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el).toHaveClass("rounded-full");
    expect(el).not.toHaveClass("rounded-lg");
  });

  it("shape=line renders a thin rounded bar (not rounded-lg/rounded-full)", () => {
    const { container } = render(<Skeleton shape="line" />);
    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el).toHaveClass("rounded");
    expect(el).not.toHaveClass("rounded-lg");
    expect(el).not.toHaveClass("rounded-full");
  });

  it("only pulses under motion-safe (prefers-reduced-motion respected via Tailwind's motion-safe variant)", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('[data-slot="skeleton"]')).toHaveClass(
      "motion-safe:animate-pulse"
    );
  });

  it("accepts an overriding className (e.g. a custom background) without losing the shape classes", () => {
    const { container } = render(
      <Skeleton shape="line" className="h-3.5 w-3/4 bg-palette-poudre" />
    );
    const el = container.querySelector('[data-slot="skeleton"]');
    expect(el).toHaveClass("h-3.5", "w-3/4", "bg-palette-poudre", "rounded");
    expect(el).not.toHaveClass("bg-muted");
  });
});
