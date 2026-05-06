import type { MonthlyRecord } from "@/lib/calc/retention";
import type { MonthlyRecordRow } from "@/lib/types/domain";

/** Last `length` calendar months merged with saved rows (no row → null starting HC). */
export function buildTrailingMonthlyTimeline(
  records: MonthlyRecordRow[],
  now: Date = new Date(),
  length = 12
): MonthlyRecord[] {
  const map = new Map<string, MonthlyRecordRow>();
  for (const r of records) {
    map.set(`${r.year}-${r.month}`, r);
  }
  const out: MonthlyRecord[] = [];
  for (let i = length - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const hit = map.get(`${year}-${month}`);
    if (hit) {
      out.push({
        year,
        month,
        startingHc: hit.starting_hc ?? null,
        newHires: hit.new_hires,
        departures: hit.departures,
      });
    } else {
      out.push({
        year,
        month,
        startingHc: null,
        newHires: 0,
        departures: 0,
      });
    }
  }
  return out;
}
