import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Supprimer</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("is closed until the trigger is activated", () => {
    render(<ConfirmDelete onConfirm={vi.fn()} />);
    expect(screen.queryByText("Supprimer définitivement ?")).not.toBeInTheDocument();
  });

  it("opens on trigger click and confirms via the action button", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDelete onConfirm={onConfirm} />);

    await user.click(screen.getByText("Supprimer"));
    expect(screen.getByText("Supprimer définitivement ?")).toBeInTheDocument();

    await user.click(screen.getByText("Confirmer"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("cancel closes the dialog without confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDelete onConfirm={onConfirm} />);

    await user.click(screen.getByText("Supprimer"));
    await user.click(screen.getByText("Annuler"));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
