import { KpiCard } from "@/components/kpi/kpi-card";
import { TrendChart } from "@/components/charts/trend-chart";
import {
  BenchmarkBar,
  HeadcountDetail,
  SiteListPanel,
  TurnoverDelta,
  computeRollingMonthCount,
} from "@/components/dashboard/metrics-blocks";
import { ReplacementCostForm } from "@/components/dashboard/replacement-cost-form";
import {
  annualizedTurnover,
  calcActiveHeadcount,
  calcCurrentRetention,
  rolling12,
  totalDepartures12mo,
  turnoverCost,
} from "@/lib/calc/retention";
import type { MonthlyRecord } from "@/lib/calc/retention";
import type { SiteRow } from "@/lib/types/domain";
import type { UserRole } from "@/lib/types/domain";
import { formatMonthYear } from "@/lib/format/months";
import { Logo } from "@/components/layout/logo";

export function DashboardView({
  orgId,
  timeline,
  sites,
  orgSlug,
  replacementCostCents,
  role,
  updatedLabel,
}: {
  orgId: string;
  timeline: MonthlyRecord[];
  sites: SiteRow[];
  orgSlug: string;
  replacementCostCents: number;
  role: UserRole;
  updatedLabel: string;
}) {
  const cur = calcCurrentRetention(timeline);
  const rolling = rolling12(timeline);
  const turnover = annualizedTurnover(timeline);
  const active = calcActiveHeadcount(timeline);
  const dep12 = totalDepartures12mo(timeline);
  const dollars = Math.round(replacementCostCents / 100);
  const totalCost = turnoverCost(dep12, replacementCostCents);
  const monthlyBurn = totalCost / 12;
  const rollingMonths = computeRollingMonthCount(timeline);
  const orgShort = orgSlug.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end md:justify-between">
        <Logo />
        <div className="flex flex-col items-start gap-1.5 md:items-end">
          <div
            className="flex items-center gap-2 text-[11px] tracking-wide text-[var(--text-muted)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--green)] shadow-[0_0_8px_var(--green)]"
              aria-hidden
            />
            <span>{updatedLabel}</span>
          </div>
          <div
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Retention = (HC <span className="text-[var(--rust-soft)]">−</span>{" "}
            Departures) / HC × 100
          </div>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          variant="primary"
          label="Current Month Retention"
          value={
            cur?.rate != null ? (
              <>
                {cur.rate.toFixed(1)}{" "}
                <span className="text-lg text-[var(--text-muted)]">%</span>
              </>
            ) : (
              <>— %</>
            )
          }
          detail={
            cur?.rate != null ? (
              <>
                {formatMonthYear(cur.row.month, cur.row.year)} · {cur.row.departures}{" "}
                departures
              </>
            ) : (
              "Awaiting data entry"
            )
          }
        />
        <KpiCard
          label="12-Month Rolling Retention"
          value={
            rolling != null ? (
              <>
                {rolling.toFixed(1)}{" "}
                <span className="text-lg text-[var(--text-muted)]">%</span>
              </>
            ) : (
              <>— %</>
            )
          }
          detail={
            rolling != null
              ? `Compounded · ${rollingMonths} month${rollingMonths !== 1 ? "s" : ""} of data`
              : "Across reporting period"
          }
        />
        <KpiCard
          variant="warning"
          label="Annualized Turnover"
          value={
            turnover != null ? (
              <>
                {turnover.toFixed(0)}{" "}
                <span className="text-lg text-[var(--text-muted)]">%</span>
              </>
            ) : (
              <>— %</>
            )
          }
          detail={<TurnoverDelta turnover={turnover} />}
        />
        <KpiCard
          variant="positive"
          label="Active Headcount"
          value={active != null ? active.current : "—"}
          detail={<HeadcountDetail active={active} />}
        />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="mb-4 flex flex-col gap-1 border-b border-[var(--border)] pb-4">
            <div
              className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-faint)]"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Monthly Retention Trend
            </div>
            <div className="text-lg font-medium text-[var(--text)]">
              Trailing 12 Months
            </div>
          </div>
          <TrendChart rows={timeline} />
          <div
            className="mt-4 flex flex-wrap gap-4 text-[11px] text-[var(--text-muted)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-4 bg-[var(--rust-soft)]"
                aria-hidden
              />
              Retention %
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-px w-4 border-t border-dashed border-[var(--text-faint)]"
                aria-hidden
              />
              Industry Avg (88%)
            </span>
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-1 w-1 rounded-full bg-[var(--green)]"
                aria-hidden
              />
              Departures
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="mb-4 flex flex-col gap-1 border-b border-[var(--border)] pb-4">
            <div
              className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-faint)]"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              By Site
            </div>
            <div className="text-lg font-medium text-[var(--text)]">
              Current snapshot
            </div>
          </div>
          <SiteListPanel sites={sites} />
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="mb-2 flex flex-col gap-1">
            <div
              className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-faint)]"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Industry Benchmark
            </div>
            <div className="text-lg font-medium text-[var(--text)]">
              Contract Security
            </div>
          </div>
          <BenchmarkBar rollingPct={rolling} orgShortName={orgShort} />
          <div
            className="mt-2 flex justify-between text-[10px] text-[var(--text-faint)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            <span>50%</span>
            <span>70%</span>
            <span>85%</span>
            <span>95%</span>
            <span>100%</span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
            Contract security has one of the highest turnover rates of any U.S.
            industry.{" "}
            <strong className="text-[var(--text)]">
              BLS data places annual turnover at 100–300%
            </strong>
            , equivalent to monthly retention of roughly 88–92%. ASIS
            International&apos;s 2023 Security Industry Workforce Survey aligns: median
            annual turnover sits near{" "}
            <strong className="text-[var(--text)]">121%</strong>. Anything above 90%
            monthly retention is competitive; above 95% is elite.
          </p>
          <div
            className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-faint)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Source · BLS JOLTS · ASIS Workforce Survey 2023
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="mb-4 flex flex-col gap-1">
            <div
              className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-faint)]"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Cost of Turnover
            </div>
            <div className="text-lg font-medium text-[var(--text)]">
              Trailing 12 Months
            </div>
          </div>
          <ReplacementCostForm orgId={orgId} dollars={dollars} role={role} />
          <div
            className="mt-4 text-3xl font-medium text-[var(--text)]"
            style={{ fontFamily: "var(--font-bricolage), serif" }}
          >
            $
            {totalCost.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div
            className="mt-3 space-y-2 border-b border-[var(--border)] pb-2 text-[11px] text-[var(--text-muted)] last:border-0"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            <div className="flex justify-between py-2">
              <span>Total Departures (12mo)</span>
              <span className="text-[var(--text)]">{dep12}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Replacement Cost / Guard</span>
              <span className="text-[var(--text)]">
                ${dollars.toLocaleString("en-US")}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>Implied Monthly Burn</span>
              <span className="text-[var(--text)]">
                $
                {monthlyBurn.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
            Replacement cost includes recruiting, BSIS guard card processing, training
            (Power-to-Arrest, on-site), uniforms, lost productivity, and overtime to
            backfill. Industry estimates range{" "}
            <strong className="text-[var(--text)]">$2,500–$5,000</strong> per non-exempt
            security guard.
          </p>
          <div
            className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-faint)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Source · Work Institute · SHRM Human Capital Benchmarking
          </div>
        </div>
      </section>

      <details className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 text-xs leading-relaxed text-[var(--text-muted)]">
        <summary
          className="cursor-pointer list-none text-[11px] uppercase tracking-[0.15em] text-[var(--text-faint)] before:mr-1 before:text-[var(--rust-soft)] before:content-['+_'] open:before:content-['−_']"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Methodology &amp; honest caveats
        </summary>
        <div className="mt-4 space-y-2.5">
          <p>
            <strong className="text-[var(--text)]">Headline formula:</strong>{" "}
            <code className="rounded bg-[var(--panel-elevated)] px-1.5 py-0.5 text-[11px] text-[var(--rust-soft)]">
              Retention = (HC − Departures) / HC × 100
            </code>{" "}
            using start-of-period headcount (SHRM standard retention rate).
          </p>
          <p>
            <strong className="text-[var(--text)]">Annualized turnover</strong> =
            average monthly departures × 12 ÷ average headcount across months with
            entered starting HC (BLS / ASIS comparable framing).
          </p>
          <p>
            <strong className="text-[var(--text)]">12-month rolling retention</strong> =
            product of monthly retention rates (compounded), reflecting sustained
            stability more than a simple average.
          </p>
          <p className="text-[var(--amber)]">
            <strong className="text-[var(--text)]">Limitations:</strong> voluntary vs
            involuntary departures are not distinguished — both count the same. For
            staffing decisions, splitting those drivers matters; consider tracking
            departure reason later.
          </p>
          <p className="text-[var(--amber)]">
            <strong className="text-[var(--text)]">HC definition:</strong> this portal
            uses start-of-period headcount. Some firms use average HC; pick one
            convention and stay consistent month to month.
          </p>
        </div>
      </details>
    </div>
  );
}
