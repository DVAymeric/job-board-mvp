import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { Nav } from "@/components/nav";
import { exportJobsCsv } from "@/app/actions";

vi.mock("next/navigation", () => ({
  usePathname: () => "/board",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: {
    href: string;
    prefetch?: boolean;
    children: ReactNode;
  }) => (
    <a href={href} data-prefetch={prefetch === false ? "false" : "true"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions", () => ({
  exportJobsCsv: vi.fn(),
  exportBackupJson: vi.fn(),
  importBackupJson: vi.fn(),
}));

vi.mock("@/app/auth-actions", () => ({
  logoutAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const session: Session = {
  user: { id: "user-1", email: "jane@example.com", name: null },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("Nav — export CSV", () => {
  beforeEach(() => {
    vi.mocked(exportJobsCsv).mockReset();
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("triggers a client-side CSV download without navigating away", async () => {
    const user = userEvent.setup();
    vi.mocked(exportJobsCsv).mockResolvedValue({
      ok: true,
      data: { csv: "﻿Titre,Entreprise\r\nDev,Acme" },
    });

    render(<Nav session={session} />);
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));

    expect(exportJobsCsv).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("shows an error toast when the export fails", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    vi.mocked(exportJobsCsv).mockResolvedValue({
      ok: false,
      error: "Impossible de générer l'export CSV",
    });

    render(<Nav session={session} />);
    await user.click(screen.getByRole("button", { name: "Exporter CSV" }));

    expect(toast.error).toHaveBeenCalledWith("Impossible de générer l'export CSV");
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("Nav — état de session", () => {
  it("shows the logout button and the account link when authenticated", () => {
    render(<Nav session={session} />);

    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mon compte" })).toBeInTheDocument();
  });

  it("hides the logout button and the account link when anonymous", () => {
    render(<Nav session={null} />);

    expect(
      screen.queryByRole("button", { name: "Se déconnecter" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mon compte" })).not.toBeInTheDocument();
  });
});

describe("Nav — pas de débordement horizontal de la page (JOB-100)", () => {
  it("lets the header scroll internally instead of forcing the whole page wider", () => {
    // Wordmark + 5 liens + 3 boutons d'action ne tiennent pas sur 320px de
    // large : sans ce scroll interne, c'est le <header> qui forçait un
    // débordement horizontal de la page entière (observé en navigateur à
    // 320px avant ce fix — scrollWidth 887 vs clientWidth 320).
    render(<Nav session={session} />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("overflow-x-auto");
  });
});

describe("Nav — prefetch des liens protégés (JOB-131)", () => {
  it("disables prefetch on links to protected routes, to avoid a background prefetch resurrecting the session cookie right after logout", () => {
    render(<Nav session={session} />);

    for (const name of ["Board", "Archives", "Analytics", "Mon compte"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "data-prefetch",
        "false"
      );
    }
  });

  it("leaves prefetch enabled for the public home link", () => {
    render(<Nav session={session} />);

    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute(
      "data-prefetch",
      "true"
    );
  });
});
