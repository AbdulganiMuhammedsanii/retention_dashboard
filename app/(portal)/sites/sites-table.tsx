"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { softDeleteSiteAction, upsertSiteAction } from "@/lib/actions/sites";
import { siteRetentionPct } from "@/lib/calc/retention";
import type { SiteRow } from "@/lib/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SortKey = "name" | "retention";

export function SitesTable({
  orgId,
  initialSites,
  canEdit,
}: {
  orgId: string;
  initialSites: SiteRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("retention");

  const ranked = useMemo(() => {
    const withRet = initialSites.map((s) => ({
      ...s,
      retention: siteRetentionPct(s.starting_hc, s.departures),
    }));
    const arr = [...withRet];
    arr.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const ra = a.retention ?? -1;
      const rb = b.retention ?? -1;
      return rb - ra;
    });
    return arr;
  }, [initialSites, sort]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={sort === "retention" ? "default" : "secondary"}
            onClick={() => setSort("retention")}
          >
            Sort by retention
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sort === "name" ? "default" : "secondary"}
            onClick={() => setSort("name")}
          >
            Sort by name
          </Button>
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              const r = await upsertSiteAction({
                orgId,
                name: "New site",
                startingHc: 0,
                departures: 0,
              });
              if (r.ok) router.refresh();
            }}
          >
            + Add site
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-[0.12em] text-[var(--text-faint)]">
              <th className="py-3 pr-3">Site</th>
              <th className="py-3 pr-3 text-right">Starting HC</th>
              <th className="py-3 pr-3 text-right">Departures</th>
              <th className="py-3 pr-3 text-right">Retention</th>
              <th className="py-3 text-right">Active</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s) => {
              const ret = s.retention;
              let color = "var(--green)";
              if (ret != null && ret < 85) color = "var(--red)";
              else if (ret != null && ret < 92) color = "var(--amber)";
              return (
                <tr key={s.id} className="border-b border-[var(--border)]">
                  <td className="py-2 pr-3">
                    <Input
                      key={`n-${s.id}-${s.updated_at}`}
                      defaultValue={s.name}
                      disabled={!canEdit}
                      className="border-[var(--border)] bg-[var(--panel-elevated)]"
                      onBlur={async (e) => {
                        const r = await upsertSiteAction({
                          id: s.id,
                          orgId,
                          name: e.target.value,
                          startingHc: s.starting_hc,
                          departures: s.departures,
                        });
                        if (r.ok) router.refresh();
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Input
                      key={`hc-${s.id}-${s.updated_at}`}
                      type="number"
                      min={0}
                      className="ml-auto w-24 border-[var(--border)] bg-[var(--panel-elevated)] text-right"
                      defaultValue={s.starting_hc}
                      disabled={!canEdit}
                      onBlur={async (e) => {
                        const v = Number.parseInt(e.target.value, 10) || 0;
                        const r = await upsertSiteAction({
                          id: s.id,
                          orgId,
                          name: s.name,
                          startingHc: v,
                          departures: s.departures,
                        });
                        if (r.ok) router.refresh();
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Input
                      key={`d-${s.id}-${s.updated_at}`}
                      type="number"
                      min={0}
                      className="ml-auto w-24 border-[var(--border)] bg-[var(--panel-elevated)] text-right"
                      defaultValue={s.departures}
                      disabled={!canEdit}
                      onBlur={async (e) => {
                        const v = Number.parseInt(e.target.value, 10) || 0;
                        const r = await upsertSiteAction({
                          id: s.id,
                          orgId,
                          name: s.name,
                          startingHc: s.starting_hc,
                          departures: v,
                        });
                        if (r.ok) router.refresh();
                      }}
                    />
                  </td>
                  <td
                    className="py-2 pr-3 text-right font-medium"
                    style={{ color: ret != null ? color : "var(--text-muted)" }}
                  >
                    {ret != null ? `${ret.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {canEdit && s.active ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const r = await softDeleteSiteAction(orgId, s.id);
                          if (r.ok) router.refresh();
                        }}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--text-faint)]">
                        {s.active ? "Yes" : "No"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
