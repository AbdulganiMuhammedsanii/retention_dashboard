/**
 * Retention math — mirrors manzanita_retention_dashboard prototype JS.
 * `startingHc: null` means an empty month cell (no starting HC entered).
 */

export type MonthlyRecord = {
  year: number;
  month: number;
  startingHc: number | null;
  newHires: number;
  departures: number;
};

export function num(n: number | null | undefined): number {
  if (n === null || n === undefined || Number.isNaN(n)) return 0;
  return n;
}

/** Same semantics as prototype `hasData` (string cell non-empty → here: finite number). */
export function hasData(r: MonthlyRecord): boolean {
  return r.startingHc !== null && Number.isFinite(r.startingHc);
}

export function retentionPct(row: MonthlyRecord): number | null {
  const hc = num(row.startingHc);
  const dep = num(row.departures);
  if (hc <= 0) return null;
  return ((hc - dep) / hc) * 100;
}

export function endingHc(r: MonthlyRecord): number {
  return num(r.startingHc) + num(r.newHires) - num(r.departures);
}

export function netChange(r: MonthlyRecord): number {
  return num(r.newHires) - num(r.departures);
}

export function rolling12(rows: MonthlyRecord[]): number | null {
  const filled = rows.filter(hasData);
  if (filled.length === 0) return null;
  let product = 1;
  let count = 0;
  for (const r of filled) {
    const ret = retentionPct(r);
    if (ret !== null) {
      product *= ret / 100;
      count++;
    }
  }
  return count > 0 ? product * 100 : null;
}

/** Annualized turnover: (avg monthly departures × 12) / avg headcount — matches prototype. */
export function annualizedTurnover(rows: MonthlyRecord[]): number | null {
  const filled = rows.filter(hasData);
  if (filled.length === 0) return null;
  const totalDep = filled.reduce((s, r) => s + num(r.departures), 0);
  const avgHc = filled.reduce((s, r) => s + num(r.startingHc), 0) / filled.length;
  if (avgHc <= 0) return null;
  const monthsOfData = filled.length;
  const annualizedDep = (totalDep / monthsOfData) * 12;
  return (annualizedDep / avgHc) * 100;
}

export function totalDepartures12mo(rows: MonthlyRecord[]): number {
  return rows.filter(hasData).reduce((s, r) => s + num(r.departures), 0);
}

export function turnoverCost(departures: number, replacementCostCents: number): number {
  return departures * (replacementCostCents / 100);
}

export function calcCurrentRetention(
  rows: MonthlyRecord[]
): { rate: number; row: MonthlyRecord } | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row && hasData(row)) {
      const rate = retentionPct(row);
      if (rate !== null) return { rate, row };
    }
  }
  return null;
}

export function calcActiveHeadcount(rows: MonthlyRecord[]): {
  current: number;
  netChange: number;
} | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row && hasData(row)) {
      const filled = rows.filter(hasData);
      const first = filled[0];
      const last = filled[filled.length - 1];
      if (!first || !last) return null;
      return {
        current: endingHc(row),
        netChange: endingHc(last) - num(first.startingHc),
      };
    }
  }
  return null;
}

/** Per-site retention %; null if invalid headcount. */
export function siteRetentionPct(
  startingHc: number,
  departures: number
): number | null {
  return retentionPct({
    year: 0,
    month: 0,
    startingHc,
    newHires: 0,
    departures,
  });
}
