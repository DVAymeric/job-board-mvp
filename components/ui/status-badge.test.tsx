import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS } from "@/lib/constants";

describe("StatusBadge", () => {
  it("renders the label in toutes lettres for TO_APPLY, with its color tokens", () => {
    render(<StatusBadge status={STATUS.TO_APPLY} />);
    const badge = screen.getByText("À postuler");
    expect(badge.closest('[data-slot="badge"]')).toHaveClass(
      "bg-status-todo-bg",
      "text-status-todo-fg"
    );
  });

  it("renders the label for APPLIED, with its color tokens", () => {
    render(<StatusBadge status={STATUS.APPLIED} />);
    const badge = screen.getByText("Postulé");
    expect(badge.closest('[data-slot="badge"]')).toHaveClass(
      "bg-status-sent-bg",
      "text-status-sent-fg"
    );
  });

  it("renders the label for INTERVIEW, with its color tokens", () => {
    render(<StatusBadge status={STATUS.INTERVIEW} />);
    const badge = screen.getByText("Entretien");
    expect(badge.closest('[data-slot="badge"]')).toHaveClass(
      "bg-status-interview-bg",
      "text-status-interview-fg"
    );
  });

  it("renders the label for REJECTED, with its color tokens (jamais le token answer/positif)", () => {
    render(<StatusBadge status={STATUS.REJECTED} />);
    const badge = screen.getByText("Refusé");
    expect(badge.closest('[data-slot="badge"]')).toHaveClass(
      "bg-status-rejected-bg",
      "text-status-rejected-fg"
    );
    expect(badge.closest('[data-slot="badge"]')).not.toHaveClass(
      "bg-status-answer-bg"
    );
  });

  it("never carries the status through color alone: an icon is always present alongside the text", () => {
    const { container } = render(<StatusBadge status={STATUS.INTERVIEW} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("marks the icon as decorative (aria-hidden) so screen readers only announce the text label once", () => {
    const { container } = render(<StatusBadge status={STATUS.APPLIED} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses a distinct icon shape per status so the status stays distinguishable without color", () => {
    const { container: toApply } = render(<StatusBadge status={STATUS.TO_APPLY} />);
    const { container: applied } = render(<StatusBadge status={STATUS.APPLIED} />);
    const { container: interview } = render(<StatusBadge status={STATUS.INTERVIEW} />);
    const { container: rejected } = render(<StatusBadge status={STATUS.REJECTED} />);
    const shapes = [toApply, applied, interview, rejected].map(
      (c) => c.querySelector("svg")?.getAttribute("class")
    );
    expect(new Set(shapes).size).toBe(4);
  });

  it("follows the revised typography scale for status labels (font-mono text-sm font-bold, JOB-87)", () => {
    render(<StatusBadge status={STATUS.APPLIED} />);
    const badge = screen.getByText("Postulé").closest('[data-slot="badge"]');
    expect(badge).toHaveClass("font-mono", "text-sm", "font-bold");
  });

  it("accepts an additional className without dropping the status color tokens", () => {
    render(<StatusBadge status={STATUS.TO_APPLY} className="mt-2" />);
    const badge = screen.getByText("À postuler").closest('[data-slot="badge"]');
    expect(badge).toHaveClass("mt-2", "bg-status-todo-bg");
  });
});
