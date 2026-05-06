import { redirect } from "next/navigation";
import { bootstrapMonthlyTrailAction } from "@/lib/actions/monthly";
import { listMonthlyRecordsForOrg } from "@/lib/supabase/queries/monthly-records";
import { getPortalContext } from "@/lib/supabase/queries/session";
import { DataEntryGrid } from "./data-entry-grid";

export default async function DataEntryPage() {
  const ctx = await getPortalContext();
  if (!ctx) redirect("/login");

  let records = await listMonthlyRecordsForOrg(ctx.profile.org_id);
  if (records.length === 0 && ctx.profile.role !== "viewer") {
    await bootstrapMonthlyTrailAction(ctx.profile.org_id);
    records = await listMonthlyRecordsForOrg(ctx.profile.org_id);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10">
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <h1
          className="text-2xl font-medium tracking-tight text-[var(--text)]"
          style={{ fontFamily: "var(--font-bricolage), serif" }}
        >
          Monthly data entry
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Inline edits auto-save. Site rows are unchanged on reset.
        </p>
      </header>
      <DataEntryGrid
        orgId={ctx.profile.org_id}
        initialRecords={records}
        canEdit={ctx.profile.role !== "viewer"}
      />
    </div>
  );
}
