import { auth } from "@/auth";
import type { ActionErrorCode } from "@/lib/types";

export type CurrentUser = { id: string; email: string; name: string | null };

export const UNAUTHENTICATED_ERROR =
  "Vous devez être connecté pour effectuer cette action.";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}

export async function requireUser(): Promise<
  | { ok: true; user: CurrentUser }
  | { ok: false; error: string; code: ActionErrorCode }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: UNAUTHENTICATED_ERROR, code: "UNAUTHENTICATED" };
  }
  return { ok: true, user };
}
