import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders the title as an <h1> on its own line", () => {
    render(<PageHeader title="Board" />);
    expect(screen.getByRole("heading", { level: 1, name: "Board" })).toBeInTheDocument();
  });

  it("renders an optional eyebrow and subtitle", () => {
    render(
      <PageHeader
        eyebrow="12 derniers mois"
        title="Analytics"
        subtitle="Suivi du funnel de conversion."
      />
    );
    expect(screen.getByText("12 derniers mois")).toBeInTheDocument();
    expect(screen.getByText("Suivi du funnel de conversion.")).toBeInTheDocument();
  });

  it("renders the title with the page-title scale (JOB-87: text-2xl)", () => {
    render(<PageHeader title="Board" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Board" });
    expect(heading).toHaveClass("text-2xl");
  });

  it("renders no toolbar row when none is given", () => {
    const { container } = render(<PageHeader title="Board" />);
    expect(container.querySelector('[data-slot="page-header-toolbar"]')).not.toBeInTheDocument();
  });

  it("renders the toolbar content on a second, full-width row below the title", () => {
    render(<PageHeader title="Board" toolbar={<button>Exporter CSV</button>} />);
    const heading = screen.getByRole("heading", { level: 1, name: "Board" });
    const toolbarButton = screen.getByRole("button", { name: "Exporter CSV" });
    expect(toolbarButton).toBeInTheDocument();
    // La toolbar suit le titre dans l'ordre du DOM (ligne 2 sous la ligne 1).
    expect(
      heading.compareDocumentPosition(toolbarButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
