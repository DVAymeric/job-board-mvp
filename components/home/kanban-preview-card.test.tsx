import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KanbanPreviewCard } from "@/components/home/kanban-preview-card";

describe("KanbanPreviewCard", () => {
  it("renders the real count for each status", () => {
    render(
      <KanbanPreviewCard
        counts={{ TO_APPLY: 3, APPLIED: 5, INTERVIEW: 1, REJECTED: 0 }}
      />
    );
    expect(screen.getByTestId("kanban-count-TO_APPLY")).toHaveTextContent("3");
    expect(screen.getByTestId("kanban-count-APPLIED")).toHaveTextContent("5");
    expect(screen.getByTestId("kanban-count-INTERVIEW")).toHaveTextContent("1");
    expect(screen.getByTestId("kanban-count-REJECTED")).toHaveTextContent("0");
  });

  it("gives the busiest column a full-width bar and scales the others proportionally", () => {
    render(
      <KanbanPreviewCard
        counts={{ TO_APPLY: 2, APPLIED: 4, INTERVIEW: 0, REJECTED: 0 }}
      />
    );
    expect(screen.getByTestId("kanban-bar-APPLIED")).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId("kanban-bar-TO_APPLY")).toHaveStyle({ width: "50%" });
  });

  it("does not divide by zero when every column is empty", () => {
    render(
      <KanbanPreviewCard
        counts={{ TO_APPLY: 0, APPLIED: 0, INTERVIEW: 0, REJECTED: 0 }}
      />
    );
    expect(screen.getByTestId("kanban-bar-TO_APPLY")).toHaveStyle({ width: "0%" });
  });
});
