"use server";

import { revalidatePath } from "next/cache";
import { siteUpsertSchema } from "@/lib/schemas/forms";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/supabase/queries/session";

export type SiteActionResult = { ok: true } | { ok: false; error: string };

export async function upsertSiteAction(input: unknown): Promise<SiteActionResult> {
  const parsed = siteUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid site payload." };
  }

  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== parsed.data.orgId) {
    return { ok: false, error: "Forbidden." };
  }
  if (ctx.profile.role === "viewer") {
    return { ok: false, error: "Viewers cannot edit sites." };
  }

  const supabase = await createServerSupabaseClient();

  if (parsed.data.id) {
    const { error } = await supabase
      .from("sites_ops")
      .update({
        name: parsed.data.name,
        starting_hc: parsed.data.startingHc,
        departures: parsed.data.departures,
        active: parsed.data.active ?? true,
      })
      .eq("id", parsed.data.id)
      .eq("org_id", parsed.data.orgId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("sites_ops").insert({
      org_id: parsed.data.orgId,
      name: parsed.data.name,
      starting_hc: parsed.data.startingHc,
      departures: parsed.data.departures,
      active: true,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/sites");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function softDeleteSiteAction(
  orgId: string,
  siteId: string
): Promise<SiteActionResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== orgId) return { ok: false, error: "Forbidden." };
  if (ctx.profile.role === "viewer") {
    return { ok: false, error: "Viewers cannot edit sites." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("sites_ops")
    .update({ active: false })
    .eq("id", siteId)
    .eq("org_id", orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/sites");
  revalidatePath("/dashboard");
  return { ok: true };
}
