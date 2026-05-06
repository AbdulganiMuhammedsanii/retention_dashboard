import Link from "next/link";
import { calcActiveHeadcount, siteRetentionPct } from "@/lib/calc/retention";
import type { MonthlyRecord } from "@/lib/calc/retention";
import type { SiteRow } from "@/lib/types/domain";

const INDUSTRY_TURNOVER_BENCH = 121;

export function SiteListPanel({ sites }: { sites: SiteRow[] }) {
  const valid = sites.filter((s) => s.active && s.starting_hc > 0);
  if (valid.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-muted)]">
        No site data yet. Add sites under{" "}
        <Link href="/sites" className="text-[var(--rust-soft)] underline">
          Sites
        </Link>
        .
      </div>
    );
  }

  const ranked = valid
    .map((s) => ({
      ...s,
      retention: siteRetentionPct(s.starting_hc, s.departures) ?? 0,
    }))
    .sort((a, b) => b.retention - a.retention);

  return (
    <div className="flex flex-col gap-3">
      {ranked.map((s) => {
        let color = "var(--green)";
        if (s.retention < 85) color = "var(--red)";
        else if (s.retention < 92) color = "var(--amber)";
        const fillPct = Math.min(s.retention, 100);
        return (
          <div
            key={s.id}
            className="rounded-md border border-[var(--border)] bg-[var(--panel-elevated)] p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text)]">{s.name}</span>
              <span className="text-sm font-medium" style={{ color }}>
                {s.retention.toFixed(1)}%
              </span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${fillPct}%`, background: color }}
              />
            </div>
            <div
              className="flex justify-between text-[11px] text-[var(--text-muted)]"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              <span>{s.starting_hc} starting HC</span>
              <span>{s.departures} departures</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BenchmarkBar({
  rollingPct,
  orgShortName,
}: {
  rollingPct: number | null;
  orgShortName: string;
}) {
  if (rollingPct === null) {
    return (
      <div className="relative mt-4 h-3 w-full rounded-full bg-[var(--border)]">
        <div
          className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-[var(--text-faint)]"
          style={{ left: "50%" }}
        />
      </div>
    );
  }
  const clamped = Math.min(Math.max(rollingPct, 50), 100);
  const pct = ((clamped - 50) / 50) * 100;
  return (
    <div className="relative mt-4">
      <div className="h-3 w-full rounded-full bg-[var(--border)]" />
      <div
        className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-[var(--text-faint)]"
        style={{ left: "88%" }}
        title="Industry avg ~88% monthly retention"
      />
      <div
        className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-[var(--rust-soft)]"
        style={{ left: `${pct}%` }}
        title={`${orgShortName} ${rollingPct.toFixed(0)}%`}
      />
      <div
        className="mt-2 text-center text-[10px] uppercase tracking-[0.12em] text-[var(--text-faint)]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {orgShortName} {rollingPct.toFixed(0)}% rolling (50–100 scale)
      </div>
    </div>
  );
}

export function TurnoverDelta({ turnover }: { turnover: number | null }) {
  if (turnover === null) return <>—</>;
  const benchmark = INDUSTRY_TURNOVER_BENCH;
  const delta = turnover - benchmark;
  if (delta < 0) {
    return (
      <span className="text-[var(--green)]">
        ↓ {Math.abs(delta).toFixed(0)}pt vs industry
      </span>
    );
  }
  return <span className="text-[var(--red)]">↑ {delta.toFixed(0)}pt vs industry</span>;
}

export function HeadcountDetail({
  active,
}: {
  active: ReturnType<typeof calcActiveHeadcount>;
}) {
  if (!active) return <>—</>;
  const sign = active.netChange >= 0 ? "+" : "";
  const cls =
    active.netChange > 0
      ? "text-[var(--green)]"
      : active.netChange < 0
        ? "text-[var(--red)]"
        : "";
  return (
    <span className={cls}>
      {sign}
      {active.netChange} net (12mo)
    </span>
  );
}

export function computeRollingMonthCount(timeline: MonthlyRecord[]): number {
  return timeline.filter((r) => r.startingHc !== null && Number.isFinite(r.startingHc))
    .length;
}
