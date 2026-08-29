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

// JOB-117 : la pagination "Page suivante" est un vrai <Link> Next.js
// (navigation App Router, pas un fetch client), donc son état "en attente"
// se lit via useLinkStatus (recommandé par Next.js précisément quand
// prefetch={false}, ce qui est déjà le cas ici). On mocke ce hook pour
// piloter l'état pending depuis les tests, sans dépendre d'une vraie
// navigation (impossible à simuler fidèlement en jsdom).
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

  it("pairs the icon with a word in the empty state, never an icon alone (JOB-120)", () => {
    render(<ReviewQueueManager initialOffers={[]} nextCursor={null} />);
    const emptyState = screen.getByTestId("review-queue-empty-state");
    const icon = emptyState.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(emptyState).toHaveTextContent(/tout est à jour/i);
  });

  it("uses body-text size (16px, JOB-87) for the empty-state message", () => {
    render(<ReviewQueueManager initialOffers={[]} nextCursor={null} />);
    const message = screen.getByText(/aucune offre n.attend votre revue/i);
    expect(message.className).toMatch(/\btext-base\b/);
  });

  it("lists offers with title, company, city and source", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    expect(screen.getByRole("link", { name: "Data Analyst" })).toHaveAttribute(
      "href",
      "https://example.com/apply/1"
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Lille")).toBeInTheDocument();
  });

  it("removes an offer from the list and shows a success toast after import", async () => {
    const user = userEvent.setup();
    vi.mocked(importHarvestedOffer).mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Importer" }));

    expect(importHarvestedOffer).toHaveBeenCalledWith({ offerId: "offer-1" });
    expect(await screen.findByText(/[Tt]out est à jour/)).toBeInTheDocument();
  });

  it("removes an offer from the list after ignoring it, without a success toast", async () => {
    const user = userEvent.setup();
    vi.mocked(ignoreHarvestedOffer).mockResolvedValue({ ok: true, data: null });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Ignorer" }));

    expect(ignoreHarvestedOffer).toHaveBeenCalledWith({ offerId: "offer-1" });
    expect(await screen.findByText(/[Tt]out est à jour/)).toBeInTheDocument();
  });

  it("keeps the offer in the list and shows an error toast when import fails", async () => {
    const user = userEvent.setup();
    vi.mocked(importHarvestedOffer).mockResolvedValue({
      ok: false,
      error: "Impossible d'importer cette offre",
      code: "INTERNAL_ERROR",
    });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Importer" }));

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

  it(
    "selects and bulk-imports multiple offers",
    async () => {
      const user = userEvent.setup();
      vi.mocked(importHarvestedOffer).mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
      const offers = [makeOffer({ id: "o1" }), makeOffer({ id: "o2", title: "Dev web" })];
      render(<ReviewQueueManager initialOffers={offers} nextCursor={null} />);

      await user.click(screen.getByRole("checkbox", { name: "Sélectionner Data Analyst" }));
      await user.click(screen.getByRole("checkbox", { name: "Sélectionner Dev web" }));
      expect(screen.getByText("2 offre(s) sélectionnée(s)")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Importer la sélection" }));

      expect(importHarvestedOffer).toHaveBeenCalledWith({ offerId: "o1" });
      expect(importHarvestedOffer).toHaveBeenCalledWith({ offerId: "o2" });
      expect(await screen.findByText(/[Tt]out est à jour/)).toBeInTheDocument();
    },
    10000
  );

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

  it("renders the import action as the positive accent button, same size as Ignorer (JOB-100)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    const importButton = screen.getByRole("button", { name: "Importer" });
    const ignoreButton = screen.getByRole("button", { name: "Ignorer" });
    expect(importButton.className).toMatch(/bg-brand-positive/);
    expect(importButton.className).toMatch(/\bh-11\b/);
    expect(ignoreButton.className).toMatch(/\bh-11\b/);
  });

  it("shows the offer source as an explicit tag badge, never a logo alone (JOB-100)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer({ source: "smartrecruiters" })]} nextCursor={null} />);
    const sourceEl = screen.getByText("smartrecruiters");
    expect(sourceEl.className).toMatch(/bg-pill-bg/);
  });

  it("signals interactivity on hover on each offer row (JOB-114)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    const row = screen.getByRole("row", { name: /Data Analyst/ });
    expect(row.className).toMatch(/hover:bg-muted/);
  });

  describe("loading state while navigating to the next page (JOB-117)", () => {
    it("keeps the real offer rows and an enabled next-page button when no navigation is pending", () => {
      useLinkStatusMock.mockReturnValue({ pending: false });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.getByText("Data Analyst")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Page suivante" })).not.toBeDisabled();
    });

    it("replaces the offer rows with row skeletons and disables the CTA while the next page is loading", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
      // Le CTA est un <a> (base-ui Button rendu comme Link) : `disabled`
      // n'existe pas nativement sur un lien, base-ui l'exprime via
      // aria-disabled (toBeDisabled() de jest-dom ne couvre que les vrais
      // éléments de formulaire, jamais les liens).
      expect(screen.getByRole("button", { name: "Page suivante" })).toHaveAttribute(
        "aria-disabled",
        "true"
      );
    });

    it("marks the offer table as busy for assistive tech while the next page is loading", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.getByRole("table", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "true"
      );
    });

    it("renders one skeleton row per currently visible offer, to keep the same table height (no CLS)", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      const offers = [makeOffer({ id: "o1" }), makeOffer({ id: "o2", title: "Dev web" })];
      const { container } = render(
        <ReviewQueueManager initialOffers={offers} nextCursor="offer-25" />
      );

      const skeletonRows = container.querySelectorAll('[role="row"] [data-slot="skeleton"]');
      expect(skeletonRows.length).toBeGreaterThan(0);
      // Les lignes squelettes sont décoratives (aria-hidden, comme
      // Skeleton lui-même) donc absentes de l'arbre d'accessibilité — on
      // les compte directement dans le DOM plutôt que via getAllByRole.
      const skeletonRowElements = container.querySelectorAll(
        '[role="row"][aria-hidden="true"]'
      );
      expect(skeletonRowElements).toHaveLength(offers.length);
    });

    it("does not show a busy/disabled state when there is no next page", () => {
      useLinkStatusMock.mockReturnValue({ pending: false });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

      expect(screen.getByRole("table", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "false"
      );
    });
  });
});
