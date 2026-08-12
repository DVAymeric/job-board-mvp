import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UrlCheckBar } from "@/components/home/url-check-bar";

const noop = () => {};

describe("UrlCheckBar", () => {
  it("shows the URL input and check button in the idle state", () => {
    render(
      <UrlCheckBar
        url=""
        checking={false}
        error={null}
        resultTag={null}
        onUrlChange={noop}
        onBlur={noop}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    expect(
      screen.getByPlaceholderText("Colle l'URL de l'offre d'emploi ici...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeInTheDocument();
    expect(screen.queryByTestId("url-check-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("url-check-tag")).not.toBeInTheDocument();
  });

  it("disables the input and button, and shows a spinner, while checking", () => {
    render(
      <UrlCheckBar
        url="example.com/job"
        checking
        error={null}
        resultTag={null}
        onUrlChange={noop}
        onBlur={noop}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    expect(screen.getByPlaceholderText(/Colle l'URL/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeDisabled();
  });

  it("disables the check button when the url is empty", () => {
    render(
      <UrlCheckBar
        url=""
        checking={false}
        error={null}
        resultTag={null}
        onUrlChange={noop}
        onBlur={noop}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    expect(screen.getByRole("button", { name: "Vérifier" })).toBeDisabled();
  });

  it("shows the error message via the live region", () => {
    render(
      <UrlCheckBar
        url="not a url"
        checking={false}
        error="URL invalide"
        resultTag={null}
        onUrlChange={noop}
        onBlur={noop}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    expect(screen.getByTestId("url-check-error")).toHaveTextContent("URL invalide");
  });

  it("shows the known-offer tag", () => {
    render(
      <UrlCheckBar
        url="example.com/job"
        checking={false}
        error={null}
        resultTag={{ kind: "known", label: "Déjà dans votre board" }}
        onUrlChange={noop}
        onBlur={noop}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    expect(screen.getByTestId("url-check-tag")).toHaveTextContent(
      "Déjà dans votre board"
    );
  });

  it("shows the new-offer tag", () => {
    render(
      <UrlCheckBar
        url="example.com/job"
        checking={false}
        error={null}
        resultTag={{ kind: "new", label: "Nouvelle offre" }}
        onUrlChange={noop}
        onBlur={noop}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    expect(screen.getByTestId("url-check-tag")).toHaveTextContent("Nouvelle offre");
  });

  it("calls onUrlChange while typing", async () => {
    const user = userEvent.setup();
    const onUrlChange = vi.fn();
    render(
      <UrlCheckBar
        url=""
        checking={false}
        error={null}
        resultTag={null}
        onUrlChange={onUrlChange}
        onBlur={noop}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    await user.type(screen.getByPlaceholderText(/Colle l'URL/), "a");
    expect(onUrlChange).toHaveBeenCalledWith("a");
  });

  it("does not fire onBlur when focus moves from the input to the Vérifier button (would strand keyboard focus if the button gets disabled mid-transition)", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <UrlCheckBar
        url="example.com/job"
        checking={false}
        error={null}
        resultTag={null}
        onUrlChange={noop}
        onBlur={onBlur}
        onCheck={noop}
        onKeyDown={noop}
      />
    );
    screen.getByPlaceholderText(/Colle l'URL/).focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Vérifier" })).toHaveFocus();
    expect(onBlur).not.toHaveBeenCalled();
  });

  it("fires onBlur when focus leaves the bar entirely", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <>
        <UrlCheckBar
          url="example.com/job"
          checking={false}
          error={null}
          resultTag={null}
          onUrlChange={noop}
          onBlur={onBlur}
          onCheck={noop}
          onKeyDown={noop}
        />
        <button>Ailleurs</button>
      </>
    );
    screen.getByPlaceholderText(/Colle l'URL/).focus();
    await user.click(screen.getByRole("button", { name: "Ailleurs" }));
    expect(onBlur).toHaveBeenCalled();
  });

  it("calls onCheck when the button is clicked", async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();
    render(
      <UrlCheckBar
        url="example.com/job"
        checking={false}
        error={null}
        resultTag={null}
        onUrlChange={noop}
        onBlur={noop}
        onCheck={onCheck}
        onKeyDown={noop}
      />
    );
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(onCheck).toHaveBeenCalled();
  });
});
