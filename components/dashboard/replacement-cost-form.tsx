"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateReplacementCostAction } from "@/lib/actions/settings";
import type { UserRole } from "@/lib/types/domain";

export function ReplacementCostForm({
  orgId,
  dollars,
  role,
}: {
  orgId: string;
  dollars: number;
  role: UserRole;
}) {
  const canEdit = role === "owner" || role === "admin";

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      action={async (formData) => {
        const raw = formData.get("replacementCostDollars");
        const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
        await updateReplacementCostAction({
          orgId,
          replacementCostDollars: Number.isFinite(n) ? n : 0,
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="replacementCostDollars"
          className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-faint)]"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Replacement cost / guard (USD)
        </label>
        <Input
          id="replacementCostDollars"
          name="replacementCostDollars"
          type="number"
          min={0}
          step={100}
          defaultValue={dollars}
          disabled={!canEdit}
          className="max-w-[140px] border-[var(--border)] bg-[var(--panel-elevated)] text-[var(--text)]"
        />
      </div>
      {canEdit ? (
        <Button type="submit" size="sm">
          Update
        </Button>
      ) : null}
    </form>
  );
}
