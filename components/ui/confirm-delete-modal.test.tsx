import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";

function renderModal(onConfirm: () => Promise<boolean>) {
  return render(
    <ConfirmDeleteModal
      trigger={<Button variant="destructive">Supprimer</Button>}
      title="Supprimer cette candidature ?"
      description="Développeur chez Acme sera définitivement supprimée."
      onConfirm={onConfirm}
    />
  );
}

describe("ConfirmDeleteModal", () => {
  it("shows no confirmation until the trigger is clicked", () => {
    renderModal(vi.fn());
    expect(
      screen.queryByText("Supprimer cette candidature ?")
    ).not.toBeInTheDocument();
  });

  it("opens the confirmation with the given title and description on trigger click", async () => {
    const user = userEvent.setup();
    renderModal(vi.fn());

    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByText("Supprimer cette candidature ?")).toBeInTheDocument();
    expect(
      screen.getByText("Développeur chez Acme sera définitivement supprimée.")
    ).toBeInTheDocument();
  });

  it("calls onConfirm and closes the dialog when confirmation succeeds", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(true);
    renderModal(onConfirm);

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(
      screen.queryByText("Supprimer cette candidature ?")
    ).not.toBeInTheDocument();
  });

  it("keeps the dialog open when onConfirm resolves false", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(false);
    renderModal(onConfirm);

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByText("Supprimer cette candidature ?")).toBeInTheDocument();
  });

  it("cancelling calls onConfirm nothing and closes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderModal(onConfirm);

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Supprimer cette candidature ?")
    ).not.toBeInTheDocument();
  });

  it("disables the confirm and cancel buttons while onConfirm is pending", async () => {
    const user = userEvent.setup();
    let resolveConfirm!: (value: boolean) => void;
    const onConfirm = vi.fn(
      () => new Promise<boolean>((resolve) => (resolveConfirm = resolve))
    );
    renderModal(onConfirm);

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

    expect(screen.getByRole("button", { name: "Confirmer la suppression" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();

    resolveConfirm(true);
  });

  it("supports a custom confirm label", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDeleteModal
        trigger={<Button variant="destructive">Supprimer</Button>}
        title="Titre"
        description="Description"
        confirmLabel="Supprimer définitivement"
        onConfirm={vi.fn().mockResolvedValue(true)}
      />
    );

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(
      screen.getByRole("button", { name: "Supprimer définitivement" })
    ).toBeInTheDocument();
  });
});
