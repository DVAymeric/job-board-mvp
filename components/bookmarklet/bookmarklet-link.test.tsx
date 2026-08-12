import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookmarkletLink } from "@/components/bookmarklet/bookmarklet-link";

describe("BookmarkletLink", () => {
  it("renders a draggable bookmarklet link pointed at the current origin", async () => {
    render(<BookmarkletLink />);

    const link = await screen.findByRole("link", { name: /Ajouter à Job Board/ });
    expect(link.getAttribute("href")).toMatch(/^javascript:/);
    expect(link.getAttribute("href")).toContain(window.location.origin);
  });

  it("explains that the link should be dragged to the bookmarks bar", async () => {
    render(<BookmarkletLink />);
    expect(
      await screen.findByText(/barre de favoris/)
    ).toBeInTheDocument();
  });
});
