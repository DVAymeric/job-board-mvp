import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutoFetchCard } from "@/components/home/auto-fetch-card";

function job(companyLogoUrl: string) {
  return {
    companyLogoUrl,
    companyName: null,
    title: null,
    url: "https://example.com/job",
  };
}

describe("AutoFetchCard", () => {
  it("renders a logo for each of up to 3 recent jobs", () => {
    render(
      <AutoFetchCard
        jobs={[
          job("https://logo.example/a.png"),
          job("https://logo.example/b.png"),
        ]}
      />
    );
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("caps the preview at 3 jobs even when more are passed", () => {
    render(
      <AutoFetchCard
        jobs={[
          job("https://logo.example/a.png"),
          job("https://logo.example/b.png"),
          job("https://logo.example/c.png"),
          job("https://logo.example/d.png"),
        ]}
      />
    );
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("shows a neutral empty state when there are no jobs yet", () => {
    render(<AutoFetchCard jobs={[]} />);
    expect(screen.getByTestId("auto-fetch-empty")).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});
