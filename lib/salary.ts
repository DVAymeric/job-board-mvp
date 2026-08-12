import { SALARY_TYPE, WORKING_DAYS_PER_YEAR, type SalaryType } from "@/lib/constants";

export function normalizeAnnualSalary(
  amount: number | null,
  type: SalaryType | string | null
): number | null {
  if (amount === null || type === null) return null;
  return type === SALARY_TYPE.DAILY_RATE ? amount * WORKING_DAYS_PER_YEAR : amount;
}

function formatThousands(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatSalary(
  amount: number | null,
  type: SalaryType | string | null
): string {
  if (amount === null || type === null) return "—";
  const formatted = formatThousands(amount);
  return type === SALARY_TYPE.DAILY_RATE
    ? `${formatted} €/j (TJM)`
    : `${formatted} €/an`;
}
