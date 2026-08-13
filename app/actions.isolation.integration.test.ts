/**
 * Real-database isolation tests (JOB-107): every Server Action that reads or
 * writes a Job/Contact/Tag is exercised against the actual local Postgres
 * (docker-compose, JOB-82) with two real users, asserting that user B can
 * never read, modify, or delete data owned by user A.
 *
 * Only the identity layer is mocked (requireUser/getCurrentUser) — auth()
 * needs a live Next.js request context (next/headers) that doesn't exist
 * outside the framework, so tests switch identity via `currentUserId`
 * instead. Everything else — Prisma queries, ownership checks — is real.
 *
 * Run with `npm run test:integration` against a running local Postgres.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { UNAUTHENTICATED_ERROR } from "@/lib/auth/session";

let currentUserId = "";

// revalidatePath needs a live Next.js request context (static generation
// store) that doesn't exist outside the framework — irrelevant to isolation,
// so it's mocked out rather than worked around.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  UNAUTHENTICATED_ERROR: "Vous devez être connecté pour effectuer cette action.",
  requireUser: async () =>
    currentUserId
      ? { ok: true as const, user: { id: currentUserId, email: "test@local", name: null } }
      : { ok: false as const, error: "Vous devez être connecté pour effectuer cette action." },
  getCurrentUser: async () =>
    currentUserId ? { id: currentUserId, email: "test@local", name: null } : null,
}));

const {
  createJob,
  checkJobUrl,
  checkRepost,
  reactivateJobWithContent,
  updateJobStatus,
  markFollowUpToday,
  updateJobDetails,
  updateJobNotes,
  updateJobSalary,
  updateJobDocuments,
  updateJobInterviewDate,
  deleteJob,
  archiveJob,
  unarchiveJob,
  reorderJobs,
  addTagToJob,
  removeTagFromJob,
  addContact,
  updateContact,
  deleteContact,
} = await import("@/app/actions");

let userA: { id: string };
let userB: { id: string };

async function asA<T>(fn: () => Promise<T>): Promise<T> {
  currentUserId = userA.id;
  return fn();
}
async function asB<T>(fn: () => Promise<T>): Promise<T> {
  currentUserId = userB.id;
  return fn();
}

async function createJobAsA(suffix: string) {
  const result = await asA(() =>
    createJob({
      url: `https://example.com/isolation-${suffix}`,
      title: `Job A ${suffix}`,
      status: "TO_APPLY",
    })
  );
  if (!result.ok) throw new Error(`setup failed: ${result.error}`);
  return result.data.id;
}

describe("Server Actions — isolation multi-tenant (base réelle)", () => {
  beforeAll(async () => {
    userA = await prisma.user.create({
      data: { email: `iso-a-${Date.now()}@test.local`, passwordHash: "x" },
    });
    userB = await prisma.user.create({
      data: { email: `iso-b-${Date.now()}@test.local`, passwordHash: "x" },
    });
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.tag.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    currentUserId = "";
  });

  it("rejects every call with no session", async () => {
    expect(await checkJobUrl("https://example.com/x")).toEqual({
      ok: false,
      error: UNAUTHENTICATED_ERROR,
    });
  });

  it("checkJobUrl: B doesn't see A's job as already tracked", async () => {
    await createJobAsA("checkurl");
    const result = await asB(() => checkJobUrl("https://example.com/isolation-checkurl"));
    expect(result).toEqual({
      ok: true,
      data: { found: false, normalizedUrl: "https://example.com/isolation-checkurl" },
    });
  });

  it("createJob: A and B can independently track the same URL", async () => {
    const url = "https://example.com/isolation-shared-url";
    const a = await asA(() => createJob({ url, title: "A's copy", status: "TO_APPLY" }));
    const b = await asB(() => createJob({ url, title: "B's copy", status: "TO_APPLY" }));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("updateJobDetails: B cannot edit A's job", async () => {
    const id = await createJobAsA("update-details");
    const result = await asB(() => updateJobDetails(id, "HACKED", "HACKED"));
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.title).toBe("Job A update-details");
  });

  it("updateJobStatus: B cannot change A's job status", async () => {
    const id = await createJobAsA("update-status");
    const result = await asB(() => updateJobStatus(id, "APPLIED"));
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.status).toBe("TO_APPLY");
  });

  it("updateJobNotes: B cannot write notes on A's job", async () => {
    const id = await createJobAsA("update-notes");
    const result = await asB(() => updateJobNotes(id, "hacked notes"));
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.notes).toBeNull();
  });

  it("updateJobSalary: B cannot set A's job salary", async () => {
    const id = await createJobAsA("update-salary");
    const result = await asB(() => updateJobSalary(id, 99999, "ANNUAL"));
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.salaryAmount).toBeNull();
  });

  it("updateJobDocuments: B cannot attach documents to A's job", async () => {
    const id = await createJobAsA("update-docs");
    const result = await asB(() =>
      updateJobDocuments(id, "https://evil.example.com/cv.pdf", "")
    );
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.resumeUrl).toBeNull();
  });

  it("updateJobInterviewDate: B cannot schedule an interview on A's job", async () => {
    const id = await createJobAsA("update-interview");
    const result = await asB(() =>
      updateJobInterviewDate(id, new Date("2026-06-01T10:00:00Z").toISOString())
    );
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.interviewDate).toBeNull();
  });

  it("markFollowUpToday: B cannot mark A's job as followed up", async () => {
    const id = await createJobAsA("followup");
    const result = await asB(() => markFollowUpToday(id));
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.lastFollowUp).toBeNull();
  });

  it("archiveJob / unarchiveJob: B cannot (un)archive A's job", async () => {
    const id = await createJobAsA("archive");
    expect((await asB(() => archiveJob(id))).ok).toBe(false);

    let job = await prisma.job.findUnique({ where: { id } });
    expect(job?.archived).toBe(false);

    await prisma.job.update({ where: { id }, data: { archived: true } });
    expect((await asB(() => unarchiveJob(id))).ok).toBe(false);

    job = await prisma.job.findUnique({ where: { id } });
    expect(job?.archived).toBe(true);
  });

  it("deleteJob: B cannot delete A's job", async () => {
    const id = await createJobAsA("delete");
    const result = await asB(() => deleteJob(id));
    expect(result.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job).not.toBeNull();
  });

  it("reorderJobs: B including A's job id fails the whole reorder atomically", async () => {
    const idA = await createJobAsA("reorder-a");
    const idB1 = await asB(() =>
      createJob({ url: "https://example.com/isolation-reorder-b1", title: "B1", status: "TO_APPLY" })
    ).then((r) => (r.ok ? r.data.id : (() => { throw new Error("setup failed"); })()));

    const result = await asB(() => reorderJobs([idB1, idA]));
    expect(result.ok).toBe(false);

    // B's own job order must be untouched by the failed transaction too.
    const jobB1 = await prisma.job.findUnique({ where: { id: idB1 } });
    expect(jobB1?.order).toBe(0);
  });

  it("addTagToJob / removeTagFromJob: B cannot tag or untag A's job", async () => {
    const id = await createJobAsA("tag");
    const addResult = await asB(() => addTagToJob(id, "Remote"));
    expect(addResult.ok).toBe(false);

    const tagCount = await prisma.jobTag.count({ where: { jobId: id } });
    expect(tagCount).toBe(0);

    const addByA = await asA(() => addTagToJob(id, "Remote"));
    expect(addByA.ok).toBe(true);
    if (!addByA.ok) throw new Error("unreachable");
    const tagId = addByA.data.tag.id;

    const removeResult = await asB(() => removeTagFromJob(id, tagId));
    expect(removeResult.ok).toBe(false);

    const stillTagged = await prisma.jobTag.count({ where: { jobId: id, tagId } });
    expect(stillTagged).toBe(1);
  });

  it("addTagToJob: A and B each get their own 'Remote' tag (no collision)", async () => {
    const idA = await createJobAsA("tag-collision-a");
    const idB = await asB(() =>
      createJob({
        url: "https://example.com/isolation-tag-collision-b",
        title: "B",
        status: "TO_APPLY",
      })
    ).then((r) => (r.ok ? r.data.id : (() => { throw new Error("setup failed"); })()));

    const tagA = await asA(() => addTagToJob(idA, "Remote"));
    const tagB = await asB(() => addTagToJob(idB, "Remote"));
    expect(tagA.ok).toBe(true);
    expect(tagB.ok).toBe(true);
    if (!tagA.ok || !tagB.ok) throw new Error("unreachable");
    expect(tagA.data.tag.id).not.toBe(tagB.data.tag.id);
  });

  it("addContact: B cannot attach a contact to A's job", async () => {
    const id = await createJobAsA("contact-add");
    const result = await asB(() =>
      addContact(id, { name: "Evil Recruiter", role: "RECRUITER" })
    );
    expect(result.ok).toBe(false);

    const count = await prisma.contact.count({ where: { jobId: id } });
    expect(count).toBe(0);
  });

  it("updateContact / deleteContact: B cannot edit or delete A's contact", async () => {
    const id = await createJobAsA("contact-edit");
    const added = await asA(() => addContact(id, { name: "Jane", role: "RECRUITER" }));
    expect(added.ok).toBe(true);
    if (!added.ok) throw new Error("unreachable");
    const contactId = added.data.contact.id;

    const updateResult = await asB(() =>
      updateContact(contactId, { name: "HACKED", role: "OTHER" })
    );
    expect(updateResult.ok).toBe(false);

    const deleteResult = await asB(() => deleteContact(contactId));
    expect(deleteResult.ok).toBe(false);

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    expect(contact?.name).toBe("Jane");
  });

  it("checkRepost / reactivateJobWithContent: B cannot repost-check or reactivate A's archived job", async () => {
    const id = await createJobAsA("repost");
    await prisma.job.update({ where: { id }, data: { archived: true } });

    const checkResult = await asB(() => checkRepost(id));
    expect(checkResult.ok).toBe(false);

    const reactivateResult = await asB(() =>
      reactivateJobWithContent({
        id,
        title: "HACKED",
        companyName: null,
        descriptionText: null,
      })
    );
    expect(reactivateResult.ok).toBe(false);

    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.archived).toBe(true);
    expect(job?.title).toBe("Job A repost");
  });
});
