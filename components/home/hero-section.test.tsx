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
    expect(hiddenLayers.length).toBeGreaterThan(0);
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
});
