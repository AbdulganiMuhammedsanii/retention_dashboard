export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatMonthYear(month: number, year: number): string {
  const n = MONTH_NAMES[month];
  return n ? `${n} ${year}` : `${month}/${year}`;
}
