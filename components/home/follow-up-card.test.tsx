import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FollowUpCard } from "@/components/home/follow-up-card";

describe("FollowUpCard", () => {
  it("shows the real number of days since the oldest pending follow-up", () => {
    render(<FollowUpCard summary={{ count: 1, oldestDays: 9 }} />);
    expect(screen.getByTestId("follow-up-badge")).toHaveTextContent("9 jours");
  });

  it("uses the singular for exactly one day", () => {
    render(<FollowUpCard summary={{ count: 1, oldestDays: 1 }} />);
    expect(screen.getByTestId("follow-up-badge")).toHaveTextContent("1 jour");
    expect(screen.getByTestId("follow-up-badge")).not.toHaveTextContent("1 jours");
  });

  it("mentions how many other applications are also overdue", () => {
    render(<FollowUpCard summary={{ count: 3, oldestDays: 9 }} />);
    expect(screen.getByTestId("follow-up-badge")).toHaveTextContent("+2 autres");
  });

  it("shows a neutral empty state when nothing needs a follow-up", () => {
    render(<FollowUpCard summary={{ count: 0, oldestDays: null }} />);
    expect(screen.getByTestId("follow-up-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("follow-up-badge")).not.toBeInTheDocument();
  });
});
