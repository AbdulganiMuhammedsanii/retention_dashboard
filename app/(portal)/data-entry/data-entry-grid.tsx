"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addNextMonthAction,
  resetMonthlyRecordsAction,
  upsertMonthlyRecordAction,
} from "@/lib/actions/monthly";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MonthlyRecordRow } from "@/lib/types/domain";
import { endingHc, netChange, retentionPct } from "@/lib/calc/retention";
import { MONTH_NAMES } from "@/lib/format/months";

type RowState = {
  id: string;
  year: number;
  month: number;
  starting: string;
  hires: string;
  departures: string;
};

function toState(r: MonthlyRecordRow): RowState {
  return {
    id: r.id,
    year: r.year,
    month: r.month,
    starting: r.starting_hc === null ? "" : String(r.starting_hc),
    hires: String(r.new_hires),
    departures: String(r.departures),
  };
}

function parseInt0(s: string): number {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

export function DataEntryGrid({
  orgId,
  initialRecords,
  canEdit,
}: {
  orgId: string;
  initialRecords: MonthlyRecordRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<RowState[]>(() => initialRecords.map(toState));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setRows(initialRecords.map(toState));
  }, [initialRecords]);

  const scheduleSave = useCallback(
    (year: number, month: number, next: RowState) => {
      const key = `${year}-${month}`;
      const prev = timers.current.get(key);
      if (prev) clearTimeout(prev);
      const t = setTimeout(async () => {
        setSaveStatus("saving");
        const startingHc =
          next.starting.trim() === "" ? null : parseInt0(next.starting);
        const res = await upsertMonthlyRecordAction({
          orgId,
          year,
          month,
          startingHc,
          newHires: parseInt0(next.hires),
          departures: parseInt0(next.departures),
        });
        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 1500);
          router.refresh();
        } else {
          setSaveStatus("error");
        }
      }, 500);
      timers.current.set(key, t);
    },
    [orgId, router]
  );

  const onCell = (
    idx: number,
    field: keyof Pick<RowState, "starting" | "hires" | "departures">,
    val: string
  ) => {
    if (!canEdit) return;
    setRows((prev) => {
      const copy = [...prev];
      const row = copy[idx];
      if (!row) return prev;
      const next = { ...row, [field]: val };
      copy[idx] = next;
      scheduleSave(row.year, row.month, next);
      return copy;
    });
  };

  const statusLabel = useMemo(() => {
    if (saveStatus === "saving") return "Saving…";
    if (saveStatus === "saved") return "✓ Saved";
    if (saveStatus === "error") return "Save failed";
    return "Auto-save enabled";
  }, [saveStatus]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-faint)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            Monthly roll-up
          </div>
          <div className="text-lg font-medium text-[var(--text)]">Editable grid</div>
        </div>
        <span
          className="text-[11px] text-[var(--text-muted)]"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-[0.12em] text-[var(--text-faint)]">
              <th className="py-3 pr-3">Month</th>
              <th className="py-3 pr-3 text-right">Starting HC</th>
              <th className="py-3 pr-3 text-right">New hires</th>
              <th className="py-3 pr-3 text-right">Departures</th>
              <th className="py-3 pr-3 text-right">Ending HC</th>
              <th className="py-3 pr-3 text-right">Retention %</th>
              <th className="py-3 text-right">Net change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const startingNum =
                r.starting.trim() === "" ? null : parseInt0(r.starting);
              const nh = parseInt0(r.hires);
              const dep = parseInt0(r.departures);
              const rec = {
                year: r.year,
                month: r.month,
                startingHc: startingNum,
                newHires: nh,
                departures: dep,
              };
              const end = endingHc(rec);
              const ret = retentionPct(rec);
              const net = netChange(rec);
              const monthLabel = MONTH_NAMES[r.month] ?? "";
              return (
                <tr key={r.id} className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3 font-medium text-[var(--text)]">
                    {monthLabel}{" "}
                    <span className="text-[var(--text-muted)]">{r.year}</span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <input
                      className="w-20 rounded border border-[var(--border)] bg-[var(--panel-elevated)] px-2 py-1 text-right text-[var(--text)] disabled:opacity-50"
                      value={r.starting}
                      disabled={!canEdit}
                      onChange={(e) => onCell(idx, "starting", e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <input
                      className="w-20 rounded border border-[var(--border)] bg-[var(--panel-elevated)] px-2 py-1 text-right text-[var(--text)] disabled:opacity-50"
                      value={r.hires}
                      disabled={!canEdit}
                      onChange={(e) => onCell(idx, "hires", e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <input
                      className="w-20 rounded border border-[var(--border)] bg-[var(--panel-elevated)] px-2 py-1 text-right text-[var(--text)] disabled:opacity-50"
                      value={r.departures}
                      disabled={!canEdit}
                      onChange={(e) => onCell(idx, "departures", e.target.value)}
                    />
                  </td>
                  <td
                    className="py-2 pr-3 text-right text-[var(--text-muted)]"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {end}
                  </td>
                  <td
                    className="py-2 pr-3 text-right text-[var(--text-muted)]"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {ret != null ? `${ret.toFixed(1)}%` : "—"}
                  </td>
                  <td
                    className="py-2 text-right text-[var(--text-muted)]"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {net >= 0 ? "+" : ""}
                    {net}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-[var(--text-faint)]">{statusLabel}</span>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const r = await addNextMonthAction(orgId);
                if (r.ok) router.refresh();
              }}
            >
              + Add month
            </Button>
          ) : null}
          {canEdit ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  Reset data
                </Button>
              </DialogTrigger>
              <DialogContent className="border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
                <DialogHeader>
                  <DialogTitle>Reset monthly data?</DialogTitle>
                  <DialogDescription className="text-[var(--text-muted)]">
                    This clears all monthly retention rows for your organization. Sites
                    are kept.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:justify-end">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      const r = await resetMonthlyRecordsAction(orgId);
                      if (r.ok) router.refresh();
                    }}
                  >
                    Confirm reset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>
    </div>
  );
}
