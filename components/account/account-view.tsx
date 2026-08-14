"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { deleteAccount } from "@/app/auth-actions";
import { toast } from "sonner";

export function AccountView({ email }: { email: string }) {
  const router = useRouter();

  async function handleDeleteAccount(): Promise<boolean> {
    const result = await deleteAccount();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Compte supprimé");
    router.push("/");
    return true;
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="font-heading text-xl text-heading">Mon compte</h1>
      <p className="text-sm text-muted-foreground">{email}</p>

      <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 p-3">
        <p className="text-sm font-medium text-heading">Zone dangereuse</p>
        <p className="text-sm text-muted-foreground">
          Supprime définitivement ton compte ainsi que toutes tes candidatures,
          contacts et tags associés. Cette action est irréversible.
        </p>
        <ConfirmDeleteModal
          trigger={
            <Button variant="destructive" className="self-start">
              Supprimer mon compte
            </Button>
          }
          title="Supprimer ton compte ?"
          description="Cette action efface définitivement ton compte ainsi que toutes tes candidatures, contacts et tags. Elle ne peut pas être annulée."
          onConfirm={handleDeleteAccount}
        />
      </div>
    </div>
  );
}
