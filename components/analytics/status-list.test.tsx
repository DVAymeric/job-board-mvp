import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusList } from "@/components/analytics/status-list";
import { STATUS } from "@/lib/constants";

const statusCounts = {
  [STATUS.TO_APPLY]: 6,
  [STATUS.APPLIED]: 7,
  [STATUS.INTERVIEW]: 4,
  [STATUS.REJECTED]: 1,
};

describe("StatusList", () => {
  it("lists every status with its count, icon and label (never color alone)", () => {
    render(<StatusList statusCounts={statusCounts} />);
    expect(screen.getByText("À postuler")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Postulé")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Entretien")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Refusé")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders an optional footer note (e.g. most active month) when provided", () => {
    render(<StatusList statusCounts={statusCounts} note="Mois le plus actif : Août (5 candidatures)." />);
    expect(
      screen.getByText("Mois le plus actif : Août (5 candidatures).")
    ).toBeInTheDocument();
  });

  it("omits the footer note when none is provided", () => {
    const { container } = render(<StatusList statusCounts={statusCounts} />);
    expect(container.querySelector("[data-status-list-note]")).not.toBeInTheDocument();
  });
});
