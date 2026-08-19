import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConnectorRun } from "@prisma/client";
import { ConnectorHealthPanel } from "@/components/harvester/connector-health-panel";
import { getConnectorsHealth } from "@/app/actions/harvest";

vi.mock("@/app/actions/harvest", () => ({
  getConnectorsHealth: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const run: ConnectorRun = {
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
};

describe("ConnectorHealthPanel", () => {
  it("renders the last-run list with no live status before checking", () => {
    render(<ConnectorHealthPanel runs={[run]} />);
    expect(screen.getByText("France Travail")).toBeInTheDocument();
    expect(screen.queryByTestId("connector-live-status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vérifier maintenant/ })).toBeInTheDocument();
  });

  it("fetches live health on click and merges it into the list", async () => {
    const user = userEvent.setup();
    vi.mocked(getConnectorsHealth).mockResolvedValue({
      ok: true,
      data: {
        health: [
          { connectorId: "francetravail", ok: false, latencyMs: 40, checkedAt: "2026-08-19T08:00:00.000Z", message: "HTTP 401" },
        ],
      },
    });
    render(<ConnectorHealthPanel runs={[run]} />);

    await user.click(screen.getByRole("button", { name: /Vérifier maintenant/ }));

    expect(getConnectorsHealth).toHaveBeenCalledTimes(1);
    const live = await screen.findByTestId("connector-live-status");
    expect(live).toHaveAttribute("data-ok", "false");
    expect(screen.getByText("HTTP 401")).toBeInTheDocument();
  });

  it("shows an error toast and keeps the list unchanged when the check fails", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    vi.mocked(getConnectorsHealth).mockResolvedValue({
      ok: false,
      error: "Trop de requêtes. Réessaie dans 12s.",
      code: "RATE_LIMITED",
    });
    render(<ConnectorHealthPanel runs={[run]} />);

    await user.click(screen.getByRole("button", { name: /Vérifier maintenant/ }));

    expect(await screen.findByText("France Travail")).toBeInTheDocument();
    expect(screen.queryByTestId("connector-live-status")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Trop de requêtes. Réessaie dans 12s.");
  });
});
