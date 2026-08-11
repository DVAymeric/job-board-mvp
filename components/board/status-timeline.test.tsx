import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { StatusHistory } from "@prisma/client";
import { StatusTimeline } from "@/components/board/status-timeline";

function entry(overrides: Partial<StatusHistory>): StatusHistory {
  return {
    id: "sh-1",
    jobId: "job-1",
    status: "TO_APPLY",
    changedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("StatusTimeline", () => {
  it("renders nothing when there is no history", () => {
    const { container } = render(<StatusTimeline history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists status transitions in chronological order with dates and labels", () => {
    render(
      <StatusTimeline
        history={[
          entry({ id: "sh-2", status: "APPLIED", changedAt: new Date("2026-01-05") }),
          entry({ id: "sh-1", status: "TO_APPLY", changedAt: new Date("2026-01-01") }),
        ]}
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("À postuler");
    expect(items[0]).toHaveTextContent("01/01/2026");
    expect(items[1]).toHaveTextContent("Postulé");
    expect(items[1]).toHaveTextContent("05/01/2026");
  });
});
