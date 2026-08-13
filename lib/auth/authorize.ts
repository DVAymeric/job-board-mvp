import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

export type AuthorizedUser = { id: string; email: string; name: string | null };

export async function authorizeCredentials(
  email: unknown,
  password: unknown
): Promise<AuthorizedUser | null> {
  if (typeof email !== "string" || typeof password !== "string") return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return null;

  if (!verifyPassword(password, user.passwordHash)) return null;

  return { id: user.id, email: user.email, name: user.name };
}
