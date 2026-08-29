import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";

function Example() {
  return (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTab value="a">Onglet A</TabsTab>
        <TabsTab value="b">Onglet B</TabsTab>
        <TabsTab value="c">Onglet C</TabsTab>
      </TabsList>
      <TabsPanel value="a">Contenu A</TabsPanel>
      <TabsPanel value="b">Contenu B</TabsPanel>
      <TabsPanel value="c">Contenu C</TabsPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("renders the tablist/tab/tabpanel ARIA roles", () => {
    render(<Example />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("shows only the active panel's content", () => {
    render(<Example />);
    expect(screen.getByText("Contenu A")).toBeInTheDocument();
    expect(screen.queryByText("Contenu B")).not.toBeInTheDocument();
    expect(screen.queryByText("Contenu C")).not.toBeInTheDocument();
  });

  it("marks the active tab via aria-selected, never color alone", () => {
    render(<Example />);
    const tabA = screen.getByRole("tab", { name: "Onglet A" });
    const tabB = screen.getByRole("tab", { name: "Onglet B" });
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(tabB).toHaveAttribute("aria-selected", "false");
    // active state must be carried by more than color: underline + bold
    expect(tabA.className).toMatch(/border-b-2/);
    expect(tabA.className).toMatch(/font-(bold|semibold)/);
  });

  it("switches panel on click", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("tab", { name: "Onglet B" }));
    expect(screen.getByText("Contenu B")).toBeInTheDocument();
    expect(screen.queryByText("Contenu A")).not.toBeInTheDocument();
  });

  it("switches tabs with ArrowRight/ArrowLeft keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const tabA = screen.getByRole("tab", { name: "Onglet A" });
    tabA.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Onglet B" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await user.keyboard("{ArrowLeft}");
    expect(tabA).toHaveAttribute("aria-selected", "true");
  });

  it("jumps to the first/last tab with Home/End", async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole("tab", { name: "Onglet A" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Onglet C" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Onglet A" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("gives each tab a touch target of at least 44px", () => {
    render(<Example />);
    const tabA = screen.getByRole("tab", { name: "Onglet A" });
    expect(tabA.className).toMatch(/min-h-11|h-11/);
  });
});
