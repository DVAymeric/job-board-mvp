import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import type { FunnelStage } from "@/lib/analytics";

const stages: FunnelStage[] = [
  { status: "TO_APPLY", label: "À postuler", count: 10, conversionFromPrevious: null },
  { status: "APPLIED", label: "Postulé", count: 6, conversionFromPrevious: 60 },
  { status: "INTERVIEW", label: "Entretien", count: 2, conversionFromPrevious: 33.3 },
  { status: "REJECTED", label: "Refusé", count: 1, conversionFromPrevious: 50 },
];

describe("FunnelChart", () => {
  it("shows every stage's label", () => {
    render(<FunnelChart stages={stages} />);
    for (const stage of stages) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
  });

  it("shows the count and conversion rate together for stages after the first", () => {
    render(<FunnelChart stages={stages} />);
    expect(screen.getByText("6 · 60%")).toBeInTheDocument();
  });

  it("shows just the raw count, with no rate, for the first stage", () => {
    render(<FunnelChart stages={stages} />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.queryByText(/10 ·/)).not.toBeInTheDocument();
  });

  it("exposes an accessible image role describing the whole funnel", () => {
    render(<FunnelChart stages={stages} />);
    expect(
      screen.getByRole("img", { name: /funnel de conversion/i })
    ).toBeInTheDocument();
  });

  it("gives every bar the same violet-to-green brand gradient, matching the mockup, instead of one flat color per stage", () => {
    const { container } = render(<FunnelChart stages={stages} />);
    const bars = container.querySelectorAll("[data-funnel-bar]");
    for (const bar of bars) {
      expect(bar).toHaveStyle({
        backgroundImage: "linear-gradient(90deg, var(--primary), var(--brand-positive))",
      });
    }
  });

  it("sizes each bar proportionally to the largest stage's count", () => {
    const { container } = render(<FunnelChart stages={stages} />);
    const bars = container.querySelectorAll("[data-funnel-bar]");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "60%" }); // 6/10
  });

  it("gives a job-less stage a hairline instead of a zero-width bar", () => {
    const emptyStages: FunnelStage[] = [
      { status: "TO_APPLY", label: "À postuler", count: 0, conversionFromPrevious: null },
    ];
    const { container } = render(<FunnelChart stages={emptyStages} />);
    const bar = container.querySelector("[data-funnel-bar]");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("adds a plain-language sentence comparing the interview stage to the first stage, instead of a raw percentage alone", () => {
    render(<FunnelChart stages={stages} />);
    // 2 sur 10 (INTERVIEW.count / TO_APPLY.count) = 20%
    expect(
      screen.getByText("2 candidatures sur 10 ont obtenu un entretien, soit 20%.")
    ).toBeInTheDocument();
  });

  it("uses the singular form when only one candidature reached the interview stage", () => {
    const singleStages: FunnelStage[] = [
      { status: "TO_APPLY", label: "À postuler", count: 4, conversionFromPrevious: null },
      { status: "INTERVIEW", label: "Entretien", count: 1, conversionFromPrevious: 25 },
    ];
    render(<FunnelChart stages={singleStages} />);
    expect(
      screen.getByText("1 candidature sur 4 a obtenu un entretien, soit 25%.")
    ).toBeInTheDocument();
  });

  it("shows a neutral, non-discouraging message when nothing has reached the interview stage yet", () => {
    const noInterviewStages: FunnelStage[] = [
      { status: "TO_APPLY", label: "À postuler", count: 5, conversionFromPrevious: null },
      { status: "INTERVIEW", label: "Entretien", count: 0, conversionFromPrevious: 0 },
    ];
    render(<FunnelChart stages={noInterviewStages} />);
    expect(
      screen.getByText("Aucune candidature n'a encore obtenu d'entretien.")
    ).toBeInTheDocument();
  });

  it("omits the sentence entirely when the stage list has no interview stage or no data at all", () => {
    render(
      <FunnelChart
        stages={[{ status: "TO_APPLY", label: "À postuler", count: 0, conversionFromPrevious: null }]}
      />
    );
    expect(screen.queryByText(/entretien/i)).not.toBeInTheDocument();
  });
});
