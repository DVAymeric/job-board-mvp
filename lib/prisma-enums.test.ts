import { describe, expect, it } from "vitest";
import { JobStatus as PrismaJobStatus, SalaryType as PrismaSalaryType } from "@prisma/client";
import { STATUS, SALARY_TYPE } from "@/lib/constants";

describe("Prisma enums stay in sync with the TS constants", () => {
  it("JobStatus (Postgres enum) matches STATUS", () => {
    expect(Object.values(PrismaJobStatus).sort()).toEqual(
      Object.values(STATUS).sort()
    );
  });

  it("SalaryType (Postgres enum) matches SALARY_TYPE", () => {
    expect(Object.values(PrismaSalaryType).sort()).toEqual(
      Object.values(SALARY_TYPE).sort()
    );
  });
});
