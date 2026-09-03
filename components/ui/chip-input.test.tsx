import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChipInput } from "@/components/ui/chip-input";

function Controlled({
  initial = [],
  placeholder,
}: {
  initial?: string[];
  placeholder?: string;
}) {
  const [values, setValues] = useState<string[]>(initial);
  return (
    <ChipInput
      id="test-chips"
      aria-label="Mots-clés"
      values={values}
      onChange={setValues}
      placeholder={placeholder}
    />
  );
}

describe("ChipInput", () => {
  it("adds a value as a chip on Enter and clears the draft input", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "data analyst{Enter}");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("adds a value as a chip on comma", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "data analyst,");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
  });

  it("adds the current draft as a chip on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Controlled />
        <button type="button">Ailleurs</button>
      </>
    );

    await user.type(screen.getByRole("textbox"), "BI");
    await user.click(screen.getByRole("button", { name: "Ailleurs" }));

    expect(screen.getByText("BI")).toBeInTheDocument();
  });

  it("trims whitespace and never adds an empty value", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "  data analyst  {Enter}");
    await user.type(screen.getByRole("textbox"), "   {Enter}");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
    expect(screen.getAllByText(/^data analyst$/)).toHaveLength(1);
  });

  it("silently ignores a case-insensitive duplicate", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "Data Analyst{Enter}");
    await user.type(screen.getByRole("textbox"), "data analyst{Enter}");

    expect(screen.getAllByText(/data analyst/i)).toHaveLength(1);
  });

  it("removes a single chip by clicking its remove button, keeping the others", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst", "BI"]} />);

    await user.click(screen.getByRole("button", { name: "Retirer data analyst" }));

    expect(screen.queryByText("data analyst")).not.toBeInTheDocument();
    expect(screen.getByText("BI")).toBeInTheDocument();
  });

  it("removes the remove button's chip via keyboard (Tab + Enter/Space)", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst"]} />);

    await user.tab(); // focus the remove button (only focusable element besides the text input)
    await user.keyboard("{Enter}");

    expect(screen.queryByText("data analyst")).not.toBeInTheDocument();
  });

  it("removes the last chip on Backspace when the draft input is empty", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst", "BI"]} />);

    await user.click(screen.getByRole("textbox"));
    await user.keyboard("{Backspace}");

    expect(screen.queryByText("BI")).not.toBeInTheDocument();
    expect(screen.getByText("data analyst")).toBeInTheDocument();
  });

  it("does not remove a chip on Backspace while the draft input has text", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst"]} />);

    await user.type(screen.getByRole("textbox"), "x{Backspace}");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
  });

  it("shows the placeholder only when there are no chips yet", () => {
    render(<Controlled placeholder="data analyst, BI" />);
    expect(screen.getByPlaceholderText("data analyst, BI")).toBeInTheDocument();
  });

  it("splits a pasted comma-separated list into one chip per value", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("textbox"));
    await user.paste("Python, R, Scala, Java, SQL");

    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("Scala")).toBeInTheDocument();
    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.getByText("SQL")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("splits a pasted newline-separated list into one chip per value", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("textbox"));
    await user.paste("Python\nR\nScala");

    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("Scala")).toBeInTheDocument();
  });

  it("merges a pasted list with an existing draft and skips duplicates", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["Python"]} />);

    await user.type(screen.getByRole("textbox"), "Go");
    await user.paste(", Python, Rust");

    expect(screen.getAllByText("Python")).toHaveLength(1);
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("Rust")).toBeInTheDocument();
  });
});
