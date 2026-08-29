import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";

describe("AnalyticsEmptyState — invitation à commencer à postuler (JOB-115)", () => {
  // Doit rester le premier test du fichier : Base UI dé-duplique son warning
  // console.error par message (donc par arbre de composants) au niveau du
  // module — un rendu antérieur du même composant dans ce fichier avalerait
  // silencieusement l'avertissement avant que ce test ne puisse l'observer.
  it("does not trigger the Base UI nativeButton warning on the CTA link (JOB-122)", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<AnalyticsEmptyState />);
    const nativeButtonWarning = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes("nativeButton")
    );
    expect(nativeButtonWarning).toBe(false);
    errorSpy.mockRestore();
  });

  it("invites the user to add a first job application instead of showing an empty/broken funnel", () => {
    render(<AnalyticsEmptyState />);
    expect(
      screen.getByText(/vos statistiques arriveront ici/i)
    ).toBeInTheDocument();
  });

  it("shows a CTA linking to the home page to add a job application", () => {
    render(<AnalyticsEmptyState />);
    // role="button" : rendu via Button render={<Link/>} nativeButton={false}
    // (JOB-122), même convention que review-queue-card.tsx/campaigns-card.tsx.
    const cta = screen.getByRole("button", { name: /ajouter une candidature/i });
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
