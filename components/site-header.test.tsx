import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/actions", () => ({
  exportJobsCsv: vi.fn(),
  exportBackupJson: vi.fn(),
  importBackupJson: vi.fn(),
}));

describe("SiteHeader", () => {
  it("renders the marketing nav on the home page", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<SiteHeader />);
    expect(screen.getByText("JobTracker")).toBeInTheDocument();
  });

  it("renders the app nav on other routes", () => {
    vi.mocked(usePathname).mockReturnValue("/board");
    render(<SiteHeader />);
    expect(screen.getByText("Suivi de candidatures")).toBeInTheDocument();
  });
});
