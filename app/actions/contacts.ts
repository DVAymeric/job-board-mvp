"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  addContactSchema,
  deleteContactSchema,
  updateContactSchema,
} from "@/lib/validation";
import {
  actionError,
  type ActionResult,
  contactOwnerWhere,
  firstIssueMessage,
  jobOwnerWhere,
  logActionError,
} from "./_shared";

export async function addContact(
  jobId: string,
  input: { name: string; role: string; linkedinUrl?: string }
): Promise<
  ActionResult<{
    contact: {
      id: string;
      userId: string;
      name: string;
      role: string | null;
      linkedinUrl: string | null;
    };
  }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = addContactSchema.safeParse({ jobId, ...input });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible d'ajouter ce contact")
    );
  }
  try {
    const job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.jobId, auth.user.id),
    });
    if (!job) {
      return actionError("NOT_FOUND", "Offre introuvable");
    }

    const contact = await prisma.contact.create({
      data: {
        jobId: parsed.data.jobId,
        userId: auth.user.id,
        name: parsed.data.name,
        role: parsed.data.role,
        linkedinUrl: parsed.data.linkedinUrl || null,
      },
    });
    revalidatePath("/board");
    return { ok: true, data: { contact } };
  } catch (error) {
    logActionError("addContact", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible d'ajouter ce contact");
  }
}

export async function updateContact(
  contactId: string,
  input: { name: string; role: string; linkedinUrl?: string }
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateContactSchema.safeParse({ contactId, ...input });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de modifier ce contact")
    );
  }
  try {
    await prisma.contact.update({
      where: contactOwnerWhere(parsed.data.contactId, auth.user.id),
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        linkedinUrl: parsed.data.linkedinUrl || null,
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("updateContact", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de modifier ce contact");
  }
}

export async function deleteContact(
  contactId: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = deleteContactSchema.safeParse({ contactId });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de supprimer ce contact")
    );
  }
  try {
    await prisma.contact.delete({
      where: contactOwnerWhere(parsed.data.contactId, auth.user.id),
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("deleteContact", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de supprimer ce contact");
  }
}
