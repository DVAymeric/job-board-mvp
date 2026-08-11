import type { Job, JobTag, Tag, Contact, StatusHistory } from "@prisma/client";

export type JobWithRelations = Job & {
  tags: (JobTag & { tag: Tag })[];
  contacts: Contact[];
  statusHistory: StatusHistory[];
};
