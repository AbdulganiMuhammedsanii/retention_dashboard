import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { buildTrailingMonthlyTimeline } from "@/lib/monthly-timeline";
import { listMonthlyRecordsForOrg } from "@/lib/supabase/queries/monthly-records";
import { listSitesForOrg } from "@/lib/supabase/queries/sites";
import { getPortalContext } from "@/lib/supabase/queries/session";

export default async function DashboardPage() {
  const ctx = await getPortalContext();
  if (!ctx) redirect("/login");

  const [monthly, sites] = await Promise.all([
    listMonthlyRecordsForOrg(ctx.profile.org_id),
    listSitesForOrg(ctx.profile.org_id),
  ]);

  const timeline = buildTrailingMonthlyTimeline(monthly, new Date(), 12);

  const updatedLabel = `UPDATED ${new Date()
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .toUpperCase()}`;

  return (
    <DashboardView
      orgId={ctx.profile.org_id}
      timeline={timeline}
      sites={sites}
      orgSlug={ctx.org.slug}
      replacementCostCents={ctx.org.replacement_cost_cents}
      role={ctx.profile.role}
      updatedLabel={updatedLabel}
    />
  );
}
