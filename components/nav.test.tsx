import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef } from "react";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { vi, beforeEach } from "vitest";
import { Nav } from "@/components/nav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/board"),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
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
  vi.mocked(useTheme).mockReturnValue({
    theme: "light",
    setTheme: vi.fn(),
    themes: ["light", "dark"],
    resolvedTheme: "light",
    systemTheme: undefined,
  });
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

describe("Nav — restyle design system (JOB-95)", () => {
  it("shows the beta chip next to the wordmark", () => {
    render(<Nav session={session} />);
    expect(screen.getByText("Bêta")).toBeInTheDocument();
  });

  it("shows login and join CTAs when anonymous, linking to /login and /register", () => {
    render(<Nav session={null} />);
    expect(screen.getByRole("link", { name: /se connecter/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(
      screen.getByRole("link", { name: /rejoindre la bêta/i })
    ).toHaveAttribute("href", "/register");
  });

  it("hides the anonymous CTAs when authenticated", () => {
    render(<Nav session={session} />);
    expect(
      screen.queryByRole("link", { name: /se connecter/i })
    ).not.toBeInTheDocument();
  });

  it("renders a mobile menu trigger hidden on desktop (functional menu covered in JOB-107 tests below)", () => {
    render(<Nav session={session} />);
    const trigger = screen.getByRole("button", { name: /ouvrir le menu/i });
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveClass("md:hidden");
  });
});

describe("Nav — toggle thème clair/sombre (JOB-119)", () => {
  it("offers switching to dark mode when the current theme is light", () => {
    render(<Nav session={session} />);
    expect(
      screen.getByRole("button", { name: /passer en thème sombre/i })
    ).toBeInTheDocument();
  });

  it("offers switching to light mode when the current theme is dark", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme: vi.fn(),
      themes: ["light", "dark"],
      resolvedTheme: "dark",
      systemTheme: undefined,
    });
    render(<Nav session={session} />);
    expect(
      screen.getByRole("button", { name: /passer en thème clair/i })
    ).toBeInTheDocument();
  });

  it("calls setTheme('dark') when clicked from light theme", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "light",
      setTheme,
      themes: ["light", "dark"],
      resolvedTheme: "light",
      systemTheme: undefined,
    });
    const user = userEvent.setup();
    render(<Nav session={session} />);

    await user.click(screen.getByRole("button", { name: /passer en thème sombre/i }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("calls setTheme('light') when clicked from dark theme", async () => {
    const setTheme = vi.fn();
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      setTheme,
      themes: ["light", "dark"],
      resolvedTheme: "dark",
      systemTheme: undefined,
    });
    const user = userEvent.setup();
    render(<Nav session={session} />);

    await user.click(screen.getByRole("button", { name: /passer en thème clair/i }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("is available on every route, including before authentication", () => {
    render(<Nav session={null} />);
    expect(
      screen.getByRole("button", { name: /passer en thème/i })
    ).toBeInTheDocument();
  });
});

describe("Nav — menu mobile (JOB-107)", () => {
  it("is not disabled anymore and starts collapsed", () => {
    render(<Nav session={session} />);
    const trigger = screen.getByRole("button", { name: /ouvrir le menu/i });
    expect(trigger).not.toBeDisabled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls");
  });

  it("hides the desktop nav links from the accessibility tree until opened, and opens the drawer on click", async () => {
    const user = userEvent.setup();
    render(<Nav session={session} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ouvrir le menu/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Base UI marque le reste de la page aria-hidden pendant que la modale est
    // ouverte (isolation a11y correcte) — le déclencheur doit donc être requêté
    // avec `hidden: true` pour rester trouvable dans ce test.
    expect(
      screen.getByRole("button", { name: /ouvrir le menu/i, hidden: true })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Nav session={session} />);
    const trigger = screen.getByRole("button", { name: /ouvrir le menu/i });

    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when a nav link inside the drawer is clicked", async () => {
    const user = userEvent.setup();
    render(<Nav session={session} />);

    await user.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    const dialog = await screen.findByRole("dialog");

    const boardLinks = screen.getAllByRole("link", { name: "Board" });
    const drawerLink = boardLinks.find((link) => dialog.contains(link));
    expect(drawerLink).toBeDefined();

    await user.click(drawerLink!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers the account link and logout inside the drawer when authenticated", async () => {
    const user = userEvent.setup();
    render(<Nav session={session} />);

    await user.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("link", { name: /mon compte/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /se déconnecter/i })
    ).toBeInTheDocument();
  });

  it("offers the login and join CTAs inside the drawer when anonymous", async () => {
    const user = userEvent.setup();
    render(<Nav session={null} />);

    await user.click(screen.getByRole("button", { name: /ouvrir le menu/i }));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("link", { name: /se connecter/i })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /rejoindre la bêta/i })
    ).toBeInTheDocument();
  });
});

describe("Nav — prefetch des liens protégés (JOB-131)", () => {
  it("disables prefetch on links to protected routes", () => {
    render(<Nav session={session} />);

    for (const name of ["Board", "Analytics", "Harvester"]) {
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
