import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactsCard } from "@/components/home/contacts-card";

describe("ContactsCard", () => {
  it("renders the editorial content with the accent tone", () => {
    render(<ContactsCard />);
    expect(screen.getByText("Notes & recruteurs")).toBeInTheDocument();
    expect(
      screen.getByText("Un contact, un lien LinkedIn, une note par candidature.")
    ).toBeInTheDocument();
    const card = screen.getByText("Notes & recruteurs").closest('[data-slot="bento-card"]');
    expect(card).toHaveAttribute("data-tone", "accent");
  });
});
