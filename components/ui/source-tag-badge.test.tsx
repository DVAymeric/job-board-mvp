import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceTagBadge } from "@/components/ui/source-tag-badge";

describe("SourceTagBadge", () => {
  it("always renders the explicit source name as text — never an icon-only badge", () => {
    render(<SourceTagBadge source="France Travail" />);
    expect(screen.getByText("France Travail")).toBeInTheDocument();
  });

  it("reuses the tag badge tokens (pill-bg/brand)", () => {
    render(<SourceTagBadge source="Workday" />);
    const badge = screen.getByText("Workday").closest('[data-slot="badge"]');
    expect(badge).toHaveClass("bg-pill-bg", "text-primary");
  });

  it("accepts an additional className", () => {
    render(<SourceTagBadge source="SmartRecruiters" className="ml-1" />);
    const badge = screen
      .getByText("SmartRecruiters")
      .closest('[data-slot="badge"]');
    expect(badge).toHaveClass("ml-1");
  });
});
