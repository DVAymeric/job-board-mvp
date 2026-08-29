import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustRow } from "@/components/home/trust-row";

describe("TrustRow", () => {
  it("renders the three reassurances in full text", () => {
    render(<TrustRow />);
    expect(
      screen.getByText(/en bêta.*accès libre.*aucune carte requise/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/vos données ne sont jamais revendues/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/vous pouvez tout exporter en un clic/i)
    ).toBeInTheDocument();
  });

  it("never mentions pricing or payment", () => {
    render(<TrustRow />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/tarif|prix|paiement|carte bancaire/i);
  });

  it("pairs each reassurance with an icon, never text alone", () => {
    const { container } = render(<TrustRow />);
    const items = container.querySelectorAll("li");
    expect(items.length).toBe(3);
    items.forEach((item) => {
      expect(item.querySelector("svg")).toBeInTheDocument();
    });
  });
});
