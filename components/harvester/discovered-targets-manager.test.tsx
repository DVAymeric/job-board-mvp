import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DiscoveredTarget } from "@prisma/client";
import { DiscoveredTargetsManager } from "@/components/harvester/discovered-targets-manager";
import { approveDiscoveredTarget, rejectDiscoveredTarget } from "@/app/actions/discovery";

vi.mock("@/app/actions/discovery", () => ({
  approveDiscoveredTarget: vi.fn(),
  rejectDiscoveredTarget: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const target: DiscoveredTarget = {
  id: "t1",
  userId: "user-1",
  companySlug: "acme",
  companyName: "Acme Corp",
  platform: "SMARTRECRUITERS",
  target: "ACME",
  status: "PENDING",
  discoveredAt: new Date("2026-01-01"),
  reviewedAt: null,
};

beforeEach(() => {
  vi.mocked(approveDiscoveredTarget).mockReset();
  vi.mocked(rejectDiscoveredTarget).mockReset();
});

describe("DiscoveredTargetsManager", () => {
  it("shows an empty state when there are no discovered targets", () => {
    render(<DiscoveredTargetsManager initialTargets={[]} />);
    expect(screen.getByText(/Aucune cible découverte/)).toBeInTheDocument();
  });

  it("lists a discovered target with its company name and platform", () => {
    render(<DiscoveredTargetsManager initialTargets={[target]} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("SMARTRECRUITERS")).toBeInTheDocument();
  });

  it("approves a target and removes it from the list on success", async () => {
    const user = userEvent.setup();
    vi.mocked(approveDiscoveredTarget).mockResolvedValue({ ok: true, data: null });
    render(<DiscoveredTargetsManager initialTargets={[target]} />);

    await user.click(screen.getByRole("button", { name: "Approuver" }));

    expect(approveDiscoveredTarget).toHaveBeenCalledWith({ targetId: "t1" });
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("rejects a target and removes it from the list on success", async () => {
    const user = userEvent.setup();
    vi.mocked(rejectDiscoveredTarget).mockResolvedValue({ ok: true, data: null });
    render(<DiscoveredTargetsManager initialTargets={[target]} />);

    await user.click(screen.getByRole("button", { name: "Rejeter" }));

    expect(rejectDiscoveredTarget).toHaveBeenCalledWith({ targetId: "t1" });
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("keeps the target in the list and shows an error toast when approval fails", async () => {
    const user = userEvent.setup();
    vi.mocked(approveDiscoveredTarget).mockResolvedValue({ ok: false, error: "Impossible d'approuver cette cible", code: "INTERNAL_ERROR" });
    render(<DiscoveredTargetsManager initialTargets={[target]} />);

    await user.click(screen.getByRole("button", { name: "Approuver" }));

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
