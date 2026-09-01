import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "@/components/home/hero-section";

describe("HeroSection", () => {
  it("renders the eyebrow, heading and lead copy", () => {
    render(
      <HeroSection>
        <div>slot content</div>
      </HeroSection>
    );
    expect(screen.getByText(/100% gratuit/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent(/offres qu.on agrège pour vous/i);
    expect(screen.getByText(/lancez votre recherche/i)).toBeInTheDocument();
  });

  it("renders its children inside the hero", () => {
    render(
      <HeroSection>
        <div>UrlCheckBar placeholder</div>
      </HeroSection>
    );
    expect(screen.getByText("UrlCheckBar placeholder")).toBeInTheDocument();
  });

  it("marks the decorative background layer as hidden from assistive tech", () => {
    const { container } = render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const hiddenLayers = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenLayers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a plain light background with a soft brand-colored glow, matching the mockup's flat hero (no photo)", () => {
    const { container } = render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    expect(container.querySelector('[data-testid="hero-bg-image"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="hero-scrim"]')).not.toBeInTheDocument();
    const glow = container.querySelector('[data-testid="hero-glow"]');
    expect(glow).toBeInTheDocument();
    expect(glow).toHaveAttribute("aria-hidden", "true");
    const section = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(section).toHaveClass("bg-background");
  });

  it("uses the project's revised page-title scale for the heading (font-heading text-2xl, JOB-87), colored for a light background", () => {
    render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("font-heading", "text-2xl", "text-heading");
  });

  it("aligns its content to the left instead of centering it", () => {
    render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    const contentContainer = heading.parentElement;
    expect(contentContainer).not.toHaveClass("text-center");
    expect(contentContainer).not.toHaveClass("items-center");
    expect(contentContainer).toHaveClass("text-left");
  });

  it("emphasizes 'agrège pour vous' in the heading in italic accent style", () => {
    render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const emphasis = screen.getByText("agrège pour vous");
    expect(emphasis.tagName).toBe("EM");
    expect(emphasis).toHaveClass("italic");
  });

  it("does not mention pasting a URL as its main value proposition anymore (JOB-139)", () => {
    render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    expect(screen.queryByText(/collez une url/i)).not.toBeInTheDocument();
  });

  it("does not repeat its own reassurance line below the hero (JOB-134) — HarvesterProofBar, rendered right after in app/page.tsx, already carries that message once", () => {
    render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    expect(screen.queryByText(/Compte gratuit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/données vous appartiennent/i)).not.toBeInTheDocument();
  });
});
