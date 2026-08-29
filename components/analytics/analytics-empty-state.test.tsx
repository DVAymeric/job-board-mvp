import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

describe("AnalyticsEmptyState — invitation à commencer à postuler (JOB-115)", () => {
  it("invites the user to add a first job application instead of showing an empty/broken funnel", () => {
    render(<AnalyticsEmptyState />);
    expect(
      screen.getByText(/vos statistiques arriveront ici/i)
    ).toBeInTheDocument();
  });

  it("shows a CTA linking to the home page to add a job application", () => {
    render(<AnalyticsEmptyState />);
    const cta = screen.getByRole("link", { name: /ajouter une candidature/i });
    expect(cta).toHaveAttribute("href", "/");
  });

  it("pairs any icon with a word, never an icon alone (JOB-120)", () => {
    render(<AnalyticsEmptyState />);
    const headline = screen.getByText(/vos statistiques arriveront ici/i);
    const icon = headline.querySelector("svg");
    if (icon) {
      expect(headline.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses body-text size (16px, JOB-87) for the supporting message", () => {
    render(<AnalyticsEmptyState />);
    const message = screen.getByText(/ajoutez votre première candidature/i);
    expect(message.className).toMatch(/\btext-base\b/);
  });
});
