import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ConnectorRun } from "@prisma/client";
import { ConnectorHealthList } from "@/components/harvester/connector-health-list";

function makeRun(overrides: Partial<ConnectorRun> = {}): ConnectorRun {
  return {
    id: "run-1",
    campaignId: "campaign-1",
    connectorId: "francetravail",
    startedAt: new Date("2026-08-19T07:00:00.000Z"),
    finishedAt: new Date("2026-08-19T07:00:05.000Z"),
    rawCount: 10,
    normalizedCount: 8,
    rejectedCount: 2,
    httpStatusesSeen: [200],
    ok: true,
    errorMessage: null,
    ...overrides,
  };
}

describe("ConnectorHealthList", () => {
  it("shows an empty state when no run exists yet", () => {
    render(<ConnectorHealthList runs={[]} />);
    expect(screen.getByText(/Aucune collecte lancée/)).toBeInTheDocument();
  });

  it("shows a healthy indicator with the connector label and offer count", () => {
    render(<ConnectorHealthList runs={[makeRun()]} />);
    const item = screen.getByTestId("connector-health-item");
    expect(item).toHaveAttribute("data-ok", "true");
    expect(screen.getByText("France Travail")).toBeInTheDocument();
    expect(screen.getByText(/8 offres/)).toBeInTheDocument();
  });

  it("marks a failed run as unhealthy", () => {
    render(<ConnectorHealthList runs={[makeRun({ ok: false, connectorId: "workday" })]} />);
    const item = screen.getByTestId("connector-health-item");
    expect(item).toHaveAttribute("data-ok", "false");
    expect(screen.getByText("Workday")).toBeInTheDocument();
  });

  it("shows the active/inactive state as text, never through color alone (JOB-100)", () => {
    render(
      <ConnectorHealthList
        runs={[makeRun({ ok: true }), makeRun({ ok: false, connectorId: "workday" })]}
      />
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});
