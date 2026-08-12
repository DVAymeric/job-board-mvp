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
    expect(screen.getByText(/zéro config/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent(/repostuler/i);
    expect(screen.getByText(/Collez l'URL/i)).toBeInTheDocument();
  });

  it("renders its children inside the hero", () => {
    render(
      <HeroSection>
        <div>UrlCheckBar placeholder</div>
      </HeroSection>
    );
    expect(screen.getByText("UrlCheckBar placeholder")).toBeInTheDocument();
  });

  it("marks the decorative background layers as hidden from assistive tech", () => {
    const { container } = render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const hiddenLayers = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenLayers.length).toBeGreaterThanOrEqual(2);
  });

  it("renders a blurred photo background layer using the hero asset", () => {
    const { container } = render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const bgLayer = container.querySelector('[data-testid="hero-bg-image"]');
    expect(bgLayer).toBeInTheDocument();
    expect(bgLayer).toHaveAttribute("aria-hidden", "true");
    expect(bgLayer?.getAttribute("style")).toContain("/hero-bg.jpg");
  });

  it("renders a scrim layer over the background photo for text legibility", () => {
    const { container } = render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const scrim = container.querySelector('[data-testid="hero-scrim"]');
    expect(scrim).toBeInTheDocument();
    expect(scrim).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the project's page-title scale for the heading (font-heading text-xl)", () => {
    render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("font-heading", "text-xl");
  });

  it("fills at least the full viewport height", () => {
    render(
      <HeroSection>
        <div>content</div>
      </HeroSection>
    );
    const heading = screen.getByRole("heading", { level: 1 });
    const section = heading.closest("section");
    expect(section).toHaveClass("min-h-dvh");
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
});
