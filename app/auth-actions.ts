"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

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

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Formulaire invalide",
    };
  }

  const { email, password, name } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "Un compte existe déjà avec cet email" };
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
    return { ok: false, error: "Impossible de créer le compte" };
  }
}

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
