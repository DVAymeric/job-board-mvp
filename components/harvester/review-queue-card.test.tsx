import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewQueueCard } from "@/components/harvester/review-queue-card";

describe("ReviewQueueCard", () => {
  it("shows an empty state when no offer is pending", () => {
    render(<ReviewQueueCard pendingCount={0} />);
    expect(screen.getByTestId("review-queue-empty")).toBeInTheDocument();
  });

  it("shows the pending count and links to the review queue", () => {
    render(<ReviewQueueCard pendingCount={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByTestId("review-queue-empty")).not.toBeInTheDocument();
    const link = screen.getByRole("button", { name: /voir la file de revue/i });
    expect(link).toHaveAttribute("href", "/harvester/review");
  });
});
