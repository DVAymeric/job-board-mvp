import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfidentialitePage from "@/app/confidentialite/page";

describe("ConfidentialitePage (JOB-119)", () => {
  it("renders a page title", () => {
    render(<ConfidentialitePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /confidentialité/i })
    ).toBeInTheDocument();
  });

  it("lists the categories of personal data collected", () => {
    render(<ConfidentialitePage />);
    expect(screen.getByText(/adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByText(/^Candidatures :/)).toBeInTheDocument();
  });

  it("names the legal basis for processing", () => {
    render(<ConfidentialitePage />);
    expect(screen.getByText(/exécution du contrat/i)).toBeInTheDocument();
  });

  it("states the retention period tied to account lifetime", () => {
    render(<ConfidentialitePage />);
    expect(screen.getByText(/tant que ton compte existe/i)).toBeInTheDocument();
  });

  it("links to the account page for self-service deletion", () => {
    render(<ConfidentialitePage />);
    const link = screen.getByRole("link", { name: /mon compte/i });
    expect(link).toHaveAttribute("href", "/account");
  });

  it("discloses the third-party services that receive data", () => {
    render(<ConfidentialitePage />);
    expect(screen.getByText(/Clearbit/i)).toBeInTheDocument();
    expect(screen.getByText(/Brandfetch/i)).toBeInTheDocument();
  });
});
