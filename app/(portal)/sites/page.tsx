import { redirect } from "next/navigation";
import { listSitesForOrg } from "@/lib/supabase/queries/sites";
import { getPortalContext } from "@/lib/supabase/queries/session";
import { SitesTable } from "./sites-table";

export default async function SitesPage() {
  const ctx = await getPortalContext();
  if (!ctx) redirect("/login");

  const sites = await listSitesForOrg(ctx.profile.org_id);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10">
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <h1
          className="text-2xl font-medium tracking-tight text-[var(--text)]"
          style={{ fontFamily: "var(--font-bricolage), serif" }}
        >
          Sites
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Per-site headcount and departures. Retention is computed from starting HC.
        </p>
      </header>
      <SitesTable
        orgId={ctx.profile.org_id}
        initialSites={sites}
        canEdit={ctx.profile.role !== "viewer"}
      />
    </div>
  );
}
