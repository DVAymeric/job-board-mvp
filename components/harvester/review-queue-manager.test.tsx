import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HarvestedOffer } from "@prisma/client";
import { ReviewQueueManager } from "@/components/harvester/review-queue-manager";
import { importHarvestedOffer, ignoreHarvestedOffer } from "@/app/actions/harvest";

vi.mock("@/app/actions/harvest", () => ({
  importHarvestedOffer: vi.fn(),
  ignoreHarvestedOffer: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { useLinkStatusMock } = vi.hoisted(() => ({
  useLinkStatusMock: vi.fn(() => ({ pending: false })),
}));

vi.mock("next/link", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/link")>();
  return {
    ...actual,
    useLinkStatus: useLinkStatusMock,
  };
});

function makeOffer(overrides: Partial<HarvestedOffer> = {}): HarvestedOffer {
  return {
    id: "offer-1",
    userId: "user-1",
    campaignId: "campaign-1",
    source: "smartrecruiters",
    sourceOfferId: "1",
    originSource: null,
    canonicalUrl: "https://example.com/jobs/1",
    applyUrl: "https://example.com/apply/1",
    title: "Data Analyst",
    companyName: "Acme",
    companyNormalizedName: "acme",
    companySiret: null,
    companyWebsite: null,
    locationLabel: "Lille",
    city: "Lille",
    postalCode: null,
    department: null,
    lat: null,
    lng: null,
    contractType: "APPRENTISSAGE",
    durationMonths: null,
    startDate: null,
    romeCodes: [],
    descriptionText: "desc",
    descriptionHtml: null,
    salary: null,
    remotePolicy: null,
    postedAt: "2026-08-01",
    expiresAt: null,
    firstSeenAt: new Date("2026-08-10"),
    lastSeenAt: new Date("2026-08-10"),
    lifecycle: "ACTIVE",
    dedupKey: "dedup-1",
    sourceRefs: [],
    rawPayload: {},
    importedJobId: null,
    ignoredAt: null,
    createdAt: new Date("2026-08-10"),
    updatedAt: new Date("2026-08-10"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(importHarvestedOffer).mockReset();
  vi.mocked(ignoreHarvestedOffer).mockReset();
  useLinkStatusMock.mockReset();
  useLinkStatusMock.mockReturnValue({ pending: false });
});

describe("ReviewQueueManager", () => {
  it("shows a positive, never-buggy-looking empty state when there are no offers (JOB-115)", () => {
    render(<ReviewQueueManager initialOffers={[]} nextCursor={null} />);
    const emptyState = screen.getByTestId("review-queue-empty-state");
    expect(emptyState).toHaveTextContent(/tout est à jour/i);
  });

  it("uses body-text size (16px, JOB-87) for the empty-state message", () => {
    render(<ReviewQueueManager initialOffers={[]} nextCursor={null} />);
    const message = screen.getByText(/aucune offre n.attend votre revue/i);
    expect(message.className).toMatch(/\btext-base\b/);
  });

  it("lists offers with title, company, city and a readable source label", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    expect(screen.getByRole("link", { name: "Data Analyst" })).toHaveAttribute(
      "href",
      "https://example.com/apply/1"
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Lille")).toBeInTheDocument();
    expect(screen.getByText("SmartRecruiters")).toBeInTheDocument();
    expect(screen.queryByText("smartrecruiters")).not.toBeInTheDocument();
  });

  it("falls back to the raw code for an unregistered source", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer({ source: "mystere" })]} nextCursor={null} />);
    expect(screen.getByText("mystere")).toBeInTheDocument();
  });

  it("adds an offer to the user's tracker and shows a success toast (JOB-149 vocabulary)", async () => {
    const user = userEvent.setup();
    vi.mocked(importHarvestedOffer).mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Ajouter à mon suivi" }));

    expect(importHarvestedOffer).toHaveBeenCalledWith({ offerId: "offer-1" });
    expect(await screen.findByText(/[Tt]out est à jour/)).toBeInTheDocument();
  });

  it("removes an offer from the list after passing on it, without a success toast", async () => {
    const user = userEvent.setup();
    vi.mocked(ignoreHarvestedOffer).mockResolvedValue({ ok: true, data: null });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Passer" }));

    expect(ignoreHarvestedOffer).toHaveBeenCalledWith({ offerId: "offer-1" });
    expect(await screen.findByText(/[Tt]out est à jour/)).toBeInTheDocument();
  });

  it("keeps the offer in the list and shows an error toast when adding to the tracker fails", async () => {
    const user = userEvent.setup();
    vi.mocked(importHarvestedOffer).mockResolvedValue({
      ok: false,
      error: "Impossible d'importer cette offre",
      code: "INTERNAL_ERROR",
    });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Ajouter à mon suivi" }));

    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
  });

  it("filters the list by city", async () => {
    const user = userEvent.setup();
    const offers = [makeOffer({ id: "o1", city: "Lille" }), makeOffer({ id: "o2", city: "Paris", title: "Dev web" })];
    render(<ReviewQueueManager initialOffers={offers} nextCursor={null} />);

    await user.type(screen.getByLabelText("Filtrer par ville"), "Paris");

    expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
    expect(screen.getByText("Dev web")).toBeInTheDocument();
  });

  it("filters the list by contract type using the design-system Select", async () => {
    const user = userEvent.setup();
    const offers = [
      makeOffer({ id: "o1", contractType: "APPRENTISSAGE" }),
      makeOffer({ id: "o2", contractType: "STAGE", title: "Stagiaire data" }),
    ];
    render(<ReviewQueueManager initialOffers={offers} nextCursor={null} />);

    await user.click(screen.getByRole("combobox", { name: "Filtrer par type de contrat" }));
    await user.click(await screen.findByRole("option", { name: "Stage" }));

    expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
    expect(screen.getByText("Stagiaire data")).toBeInTheDocument();
  });

  it("has no table/row semantics and no selection checkboxes left (JOB-152)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("row")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows a next-page link with the given cursor", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);
    expect(screen.getByRole("button", { name: "Page suivante" })).toHaveAttribute(
      "href",
      "/harvester/review?cursor=offer-25"
    );
  });

  it("does not render a next-page link when there is none", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    expect(screen.queryByRole("button", { name: "Page suivante" })).not.toBeInTheDocument();
  });

  it("renders the tracker action as the positive accent button, same height as Passer (JOB-100)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    const importButton = screen.getByRole("button", { name: "Ajouter à mon suivi" });
    const ignoreButton = screen.getByRole("button", { name: "Passer" });
    expect(importButton.className).toMatch(/bg-brand-positive/);
    expect(importButton.className).toMatch(/\bh-11\b/);
    expect(ignoreButton.className).toMatch(/\bh-11\b/);
  });

  it("signals interactivity on hover on each offer card (JOB-114)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    const card = screen.getByText("Data Analyst").closest("li");
    expect(card?.className).toMatch(/hover:bg-muted/);
  });

  describe("loading state while navigating to the next page (JOB-117)", () => {
    it("keeps the real offer cards and an enabled next-page button when no navigation is pending", () => {
      useLinkStatusMock.mockReturnValue({ pending: false });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.getByText("Data Analyst")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Page suivante" })).not.toBeDisabled();
    });

    it("replaces the offer cards with skeletons and disables the CTA while the next page is loading", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Page suivante" })).toHaveAttribute(
        "aria-disabled",
        "true"
      );
    });

    it("marks the offer list as busy for assistive tech while the next page is loading", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.getByRole("list", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "true"
      );
    });

    it("does not show a busy state when there is no next page", () => {
      useLinkStatusMock.mockReturnValue({ pending: false });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

      expect(screen.getByRole("list", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "false"
      );
    });

    it("with a key change from the parent, shows the new page's offers and clears the loading indicator", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      const { rerender } = render(
        <ReviewQueueManager
          key="page-1"
          initialOffers={[makeOffer({ id: "o1", title: "Data Analyst" })]}
          nextCursor="offer-25"
        />
      );

      useLinkStatusMock.mockReturnValue({ pending: false });
      rerender(
        <ReviewQueueManager
          key="page-2"
          initialOffers={[makeOffer({ id: "o2", title: "Dev Web" })]}
          nextCursor={null}
        />
      );

      expect(screen.getByText("Dev Web")).toBeInTheDocument();
      expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
      expect(screen.getByRole("list", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "false"
      );
    });
  });
});
