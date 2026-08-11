import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompanyAvatar } from "@/components/board/company-avatar";

const base = {
  companyLogoUrl: null,
  companyName: null,
  title: null,
  url: "https://acme.com/careers/42",
};

describe("CompanyAvatar", () => {
  it("renders the logo image when companyLogoUrl is set", () => {
    render(<CompanyAvatar job={{ ...base, companyLogoUrl: "https://logo.example/acme.png" }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://logo.example/acme.png");
  });

  it("falls back to the company name's initial when there is no logo", () => {
    render(<CompanyAvatar job={{ ...base, companyName: "Acme Corp" }} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("falls back to the title's initial when there is no company name", () => {
    render(<CompanyAvatar job={{ ...base, title: "Développeur" }} />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("falls back to the url domain's initial when nothing else is set", () => {
    render(<CompanyAvatar job={base} />);
    expect(screen.getByText("A")).toBeInTheDocument(); // acme.com -> "A"
  });

  it("falls back to the initial when the logo image fails to load", () => {
    render(<CompanyAvatar job={{ ...base, companyLogoUrl: "https://broken/logo.png", companyName: "Acme" }} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
