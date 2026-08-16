import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef } from "react";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { vi, beforeEach } from "vitest";
import { Nav } from "@/components/nav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/board"),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock(
  "next/link",
  () => ({
    default: forwardRef<
      HTMLAnchorElement,
      { href: string; prefetch?: boolean; children: ReactNode }
    >(function LinkMock({ href, prefetch, children, ...rest }, ref) {
      return (
        <a
          ref={ref}
          href={href}
          data-prefetch={prefetch === false ? "false" : "true"}
          {...rest}
        >
          {children}
        </a>
      );
    }),
  })
);

vi.mock("@/app/auth-actions", () => ({
  logoutAction: vi.fn(),
}));

const session: Session = {
  user: { id: "user-1", email: "jane@example.com", name: null },
  expires: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/board");
});

describe("Nav — état de session", () => {
  it("shows the account menu trigger when authenticated", () => {
    render(<Nav session={session} />);
    expect(screen.getByRole("button", { name: /compte/i })).toBeInTheDocument();
  });

  it("hides the account menu trigger when anonymous", () => {
    render(<Nav session={null} />);
    expect(screen.queryByRole("button", { name: /compte/i })).not.toBeInTheDocument();
  });
});

describe("Nav — menu compte (groupe compte + déconnexion)", () => {
  it("opens a menu with the account link and logout on trigger click", async () => {
    const user = userEvent.setup();
    render(<Nav session={session} />);

    await user.click(screen.getByRole("button", { name: /compte/i }));

    // Base UI Menu diffère l'ouverture via requestAnimationFrame : les
    // éléments du menu n'apparaissent pas de façon synchrone après le clic.
    const accountItem = await screen.findByRole("menuitem", { name: /mon compte/i });
    expect(accountItem).toHaveAttribute("href", "/account");
    expect(screen.getByRole("menuitem", { name: /se déconnecter/i })).toBeInTheDocument();
  });

  it("keeps the account link and logout hidden until the trigger is clicked", () => {
    render(<Nav session={session} />);
    expect(screen.queryByRole("menuitem", { name: /mon compte/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /se déconnecter/i })).not.toBeInTheDocument();
  });
});

describe("Nav — export CSV n'apparaît plus dans la nav globale", () => {
  it("never renders an 'Exporter CSV' button, on any route", () => {
    render(<Nav session={session} />);
    expect(screen.queryByRole("button", { name: "Exporter CSV" })).not.toBeInTheDocument();
  });
});

describe("Nav — pas de débordement horizontal de la page (JOB-100)", () => {
  it("lets the header scroll internally instead of forcing the whole page wider", () => {
    render(<Nav session={session} />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("overflow-x-auto");
  });
});

describe("Nav — prefetch des liens protégés (JOB-131)", () => {
  it("disables prefetch on links to protected routes", () => {
    render(<Nav session={session} />);

    for (const name of ["Board", "Analytics"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "data-prefetch",
        "false"
      );
    }
  });

  it("disables prefetch on the account link inside the menu", async () => {
    const user = userEvent.setup();
    render(<Nav session={session} />);

    await user.click(screen.getByRole("button", { name: /compte/i }));
    expect(
      await screen.findByRole("menuitem", { name: /mon compte/i })
    ).toHaveAttribute("data-prefetch", "false");
  });

  it("leaves prefetch enabled for the public home link", () => {
    render(<Nav session={session} />);

    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute(
      "data-prefetch",
      "true"
    );
  });
});
