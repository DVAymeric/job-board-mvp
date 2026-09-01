import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchForm } from "@/components/search/search-form";

describe("SearchForm", () => {
  it("renders three distinct, labelled fields (keyword, location, contract type)", () => {
    render(<SearchForm onSearch={() => {}} />);
    expect(screen.getByLabelText(/métier|mot-clé/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ville|code postal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type de contrat/i)).toBeInTheDocument();
  });

  it("submits the typed keyword and location via onSearch when the search button is clicked", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} />);

    await user.type(screen.getByLabelText(/métier|mot-clé/i), "Développeur");
    await user.type(screen.getByLabelText(/ville|code postal/i), "Reims");
    await user.click(screen.getByRole("button", { name: /rechercher/i }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    const criteria = onSearch.mock.calls[0][0];
    expect(criteria.keyword).toBe("Développeur");
    expect(criteria.location).toBe("Reims");
  });

  it("submitting via the Enter key (form submit) also calls onSearch", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} />);

    const keywordField = screen.getByLabelText(/métier|mot-clé/i);
    await user.type(keywordField, "Assistant RH{Enter}");

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("the search button is not the accent (green) variant reserved for positive actions like Postuler", () => {
    render(<SearchForm onSearch={() => {}} />);
    const button = screen.getByRole("button", { name: /rechercher/i });
    expect(button.className).not.toMatch(/bg-brand-positive/);
  });

  it("guarantees a 44px touch target on every field, matching the submit button (JOB-90, audited in JOB-145)", () => {
    render(<SearchForm onSearch={() => {}} />);
    expect(screen.getByLabelText(/métier|mot-clé/i).className).toMatch(/\bh-11\b/);
    expect(screen.getByLabelText(/ville|code postal/i).className).toMatch(/\bh-11\b/);
    expect(screen.getByRole("combobox", { name: /type de contrat/i }).className).toMatch(/\bh-11\b/);
    expect(screen.getByRole("button", { name: /rechercher/i }).className).toMatch(/\bh-11\b/);
  });

  it("pre-fills its fields from initialCriteria (JOB-139)", () => {
    render(
      <SearchForm
        onSearch={() => {}}
        initialCriteria={{ keyword: "Développeur", location: "Reims", contractType: "" }}
      />
    );
    expect(screen.getByLabelText(/métier|mot-clé/i)).toHaveValue("Développeur");
    expect(screen.getByLabelText(/ville|code postal/i)).toHaveValue("Reims");
  });
});
