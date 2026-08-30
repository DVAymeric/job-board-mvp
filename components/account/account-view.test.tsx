import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountView } from "@/components/account/account-view";
import { deleteAccount } from "@/app/auth-actions";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/auth-actions", () => ({
  deleteAccount: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("AccountView", () => {
  beforeEach(() => {
    vi.mocked(deleteAccount).mockReset();
    push.mockReset();
  });

  it("shows the account's email", () => {
    render(<AccountView email="jane@example.com" />);

    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("links to /tarifs, previously orphaned (unreachable from any nav point) — JOB-133", () => {
    render(<AccountView email="jane@example.com" />);

    expect(screen.getByRole("link", { name: /tarifs/i })).toHaveAttribute("href", "/tarifs");
  });

  it("deletes the account via the shared confirmation modal and redirects home", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    vi.mocked(deleteAccount).mockResolvedValue({ ok: true });

    render(<AccountView email="jane@example.com" />);

    await user.click(screen.getByRole("button", { name: "Supprimer mon compte" }));
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByText("Supprimer ton compte ?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(deleteAccount).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });

  it("shows an error toast and does not redirect when deletion fails", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    vi.mocked(deleteAccount).mockResolvedValue({
      ok: false,
      error: "Impossible de supprimer le compte",
      code: "INTERNAL_ERROR",
    });

    render(<AccountView email="jane@example.com" />);

    await user.click(screen.getByRole("button", { name: "Supprimer mon compte" }));
    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(toast.error).toHaveBeenCalledWith("Impossible de supprimer le compte");
    expect(push).not.toHaveBeenCalled();
  });
});
