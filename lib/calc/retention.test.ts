import { describe, expect, it } from "vitest";
import {
  annualizedTurnover,
  calcActiveHeadcount,
  calcCurrentRetention,
  endingHc,
  hasData,
  retentionPct,
  rolling12,
  totalDepartures12mo,
  type MonthlyRecord,
} from "./retention";

function m(
  year: number,
  month: number,
  startingHc: number,
  newHires: number,
  departures: number
): MonthlyRecord {
  return { year, month, startingHc, newHires, departures };
}

describe("retentionPct", () => {
  it("returns null when HC is 0 (not NaN/Infinity)", () => {
    expect(
      retentionPct({
        year: 2025,
        month: 0,
        startingHc: 0,
        newHires: 0,
        departures: 0,
      })
    ).toBeNull();
  });

  it("computes standard rate", () => {
    expect(retentionPct(m(2025, 0, 50, 0, 4))).toBeCloseTo(92, 5);
  });
});

describe("hasData", () => {
  it("treats null starting HC as no data", () => {
    expect(
      hasData({
        year: 2025,
        month: 0,
        startingHc: null,
        newHires: 1,
        departures: 0,
      })
    ).toBe(false);
  });
});

describe("rolling12", () => {
  it("returns null for empty input", () => {
    expect(rolling12([])).toBeNull();
  });

  it("12 months stable HC=50 and 4 departures/month compounds correctly", () => {
    const rows: MonthlyRecord[] = [];
    for (let mo = 0; mo < 12; mo++) {
      rows.push(m(2025, mo, 50, 0, 4));
    }
    const rolling = rolling12(rows);
    expect(rolling).not.toBeNull();
    let product = 1;
    for (let i = 0; i < 12; i++) {
      product *= 46 / 50;
    }
    expect(rolling).toBeCloseTo(product * 100, 5);
  });
});

describe("annualizedTurnover", () => {
  it("returns null when no filled months", () => {
    expect(annualizedTurnover([])).toBeNull();
  });

  it("matches 96% for 12 months HC=50 and 4 departures/month", () => {
    const rows: MonthlyRecord[] = [];
    for (let mo = 0; mo < 12; mo++) {
      rows.push(m(2025, mo, 50, 0, 4));
    }
    const t = annualizedTurnover(rows);
    expect(t).toBeCloseTo(96, 5);
  });

  it("annualizes partial-year data using actual month count", () => {
    const rows = [
      m(2025, 0, 50, 0, 4),
      m(2025, 1, 50, 0, 4),
      m(2025, 2, 50, 0, 4),
      m(2025, 3, 50, 0, 4),
      m(2025, 4, 50, 0, 4),
      m(2025, 5, 50, 0, 4),
    ];
    const t = annualizedTurnover(rows);
    expect(t).toBeCloseTo(96, 5);
  });
});

describe("totalDepartures12mo", () => {
  it("sums departures for hasData months", () => {
    const rows = [
      m(2025, 0, 50, 0, 2),
      m(2025, 1, 50, 0, 3),
      { year: 2025, month: 2, startingHc: null, newHires: 0, departures: 99 },
    ];
    expect(totalDepartures12mo(rows)).toBe(5);
  });
});

describe("golden scenarios vs prototype logic", () => {
  it("current retention picks most recent hasData month", () => {
    const rows = [m(2025, 0, 40, 0, 4), m(2025, 1, 40, 0, 2)];
    const cur = calcCurrentRetention(rows);
    expect(cur?.row.month).toBe(1);
    expect(cur?.rate).toBeCloseTo(95, 5);
  });

  it("active headcount net change matches prototype formula", () => {
    const rows = [m(2025, 0, 40, 0, 0), m(2025, 1, 40, 5, 2)];
    const a = calcActiveHeadcount(rows);
    expect(a).not.toBeNull();
    const last = rows[1];
    expect(last).toBeDefined();
    expect(a?.current).toBe(endingHc(last));
    expect(a?.netChange).toBe(endingHc(last) - 40);
  });
});
