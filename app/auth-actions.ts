"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import type { ActionErrorCode } from "@/lib/types";

export type AuthFormState = { error: string | null };

const INVALID_CREDENTIALS_ERROR = "Email ou mot de passe incorrect.";

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email requis")
    .email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  name: z.string().trim().optional(),
});

/**
 * Crée un compte utilisateur (email + mot de passe haché). N'établit pas de
 * session — voir `registerAction` pour l'inscription + connexion combinées.
 *
 * @param input.email Email (normalisé en minuscules).
 * @param input.password Mot de passe en clair, min 8 caractères.
 * @param input.name Nom optionnel.
 * @errors `VALIDATION_ERROR`, `CONFLICT` (email déjà utilisé),
 * `INTERNAL_ERROR`.
 */
export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<
  { ok: true } | { ok: false; error: string; code: ActionErrorCode }
> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide",
      code: "VALIDATION_ERROR",
    };
  }

  const { email, password, name } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return {
        ok: false,
        error: "Un compte existe déjà avec cet email",
        code: "CONFLICT",
      };
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name: name || null,
      },
    });

    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de créer le compte", code: "INTERNAL_ERROR" };
  }
}

/**
 * Authentifie via `next-auth` Credentials et redirige vers `callbackUrl`
 * (ou `/board` par défaut) en cas de succès. Prévue pour `useActionState`
 * (form action + état de formulaire), pas le contrat `ActionResult`
 * habituel des autres Server Actions de ce projet.
 *
 * @param formData Champs `email`, `password`, `callbackUrl` (optionnel).
 * @returns `{ error: null }` en cas de succès (suivi d'une redirection côté
 * next-auth) ; `{ error: string }` sur identifiants invalides.
 */
export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: (formData.get("callbackUrl") as string) || "/board",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: INVALID_CREDENTIALS_ERROR };
    }
    throw error;
  }
}

/**
 * Crée un compte puis authentifie immédiatement (combine `registerUser` +
 * connexion). Prévue pour `useActionState`, comme `loginAction`.
 *
 * @param formData Champs `email`, `password`, `name` (optionnel).
 * @returns `{ error: null }` en cas de succès (redirection vers `/board`) ;
 * `{ error: string }` sur échec de création ou de connexion automatique.
 */
export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");

  const result = await registerUser({
    email,
    password,
    name: name || undefined,
  });
  if (!result.ok) {
    return { error: result.error };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/board" });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "Compte créé, mais la connexion automatique a échoué. Réessaie de te connecter.",
      };
    }
    throw error;
  }
}

/**
 * Termine la session courante et redirige vers `/`. Liée à un
 * `<form action={logoutAction}>` (components/nav.tsx) — pas d'`ActionResult`
 * en retour, la redirection sert de signal de succès.
 */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/**
 * Supprime définitivement le compte de l'utilisateur courant — cascade sur
 * toutes ses candidatures/contacts/tags (schéma Prisma) — puis termine la
 * session. Irréversible.
 *
 * @errors `UNAUTHENTICATED`, `INTERNAL_ERROR`.
 */
export async function deleteAccount(): Promise<
  { ok: true } | { ok: false; error: string; code: ActionErrorCode }
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  try {
    // Le schéma Prisma cascade la suppression de tous les Job/Contact/Tag/
    // JobTag/StatusHistory liés (onDelete: Cascade), donc un seul delete
    // suffit à effacer l'intégralité des données de l'utilisateur.
    await prisma.user.delete({ where: { id: auth.user.id } });
  } catch {
    return { ok: false, error: "Impossible de supprimer le compte", code: "INTERNAL_ERROR" };
  }

  await signOut({ redirect: false });
  return { ok: true };
}
