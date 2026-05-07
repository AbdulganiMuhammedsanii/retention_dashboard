import { redirect } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import {
  updateOrganizationNameFromForm,
  updateReplacementCostFromForm,
} from "@/lib/actions/settings";
import { getPortalContext } from "@/lib/supabase/queries/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const ctx = await getPortalContext();
  if (!ctx) redirect("/login");

  const dollars = Math.round(ctx.org.replacement_cost_cents / 100);
  const canEditCost = ctx.profile.role === "owner" || ctx.profile.role === "admin";
  const canRename = ctx.profile.role === "owner";

  return (
    <div className="mx-auto max-w-xl px-5 py-8 md:px-10">
      <h1
        className="mb-8 text-2xl font-medium tracking-tight text-[var(--text)]"
        style={{ fontFamily: "var(--font-bricolage), serif" }}
      >
        Settings
      </h1>

      <Card className="mb-6 border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
        <CardHeader>
          <CardTitle className="text-lg">Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateOrganizationNameFromForm} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                name="orgName"
                defaultValue={ctx.org.name}
                disabled={!canRename}
                className="border-[var(--border)] bg-[var(--panel-elevated)]"
              />
            </div>
            {canRename ? (
              <Button type="submit" size="sm">
                Save name
              </Button>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Only owners can rename the org.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
        <CardHeader>
          <CardTitle className="text-lg">Replacement cost</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateReplacementCostFromForm} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="replacementCostDollars">USD per guard</Label>
              <Input
                id="replacementCostDollars"
                name="replacementCostDollars"
                type="number"
                min={0}
                step={100}
                defaultValue={dollars}
                disabled={!canEditCost}
                className="max-w-xs border-[var(--border)] bg-[var(--panel-elevated)]"
              />
            </div>
            {canEditCost ? (
              <Button type="submit" size="sm">
                Save
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6 border-[var(--border)] bg-[var(--panel)] text-[var(--text)]">
        <CardHeader>
          <CardTitle className="text-lg">Team</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-muted)]">
            In-app invites are coming soon (Phase 2). For now, set{" "}
            <code className="rounded bg-[var(--panel-elevated)] px-1 text-xs">
              ALLOWLIST_EMAILS
            </code>{" "}
            (comma-separated) and{" "}
            <code className="rounded bg-[var(--panel-elevated)] px-1 text-xs">
              ALLOWLIST_ORG_ID
            </code>
            , then redeploy.
          </p>
        </CardContent>
      </Card>

      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out everywhere on this device
        </Button>
      </form>
    </div>
  );
}
