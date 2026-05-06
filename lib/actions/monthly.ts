"use server";

import { revalidatePath } from "next/cache";
import { monthlyUpsertSchema } from "@/lib/schemas/forms";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/supabase/queries/session";
import { listMonthlyRecordsForOrg } from "@/lib/supabase/queries/monthly-records";

export type MonthlyActionResult = { ok: true } | { ok: false; error: string };

export async function upsertMonthlyRecordAction(
  input: unknown
): Promise<MonthlyActionResult> {
  const parsed = monthlyUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid monthly record payload." };
  }

  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== parsed.data.orgId) {
    return { ok: false, error: "Forbidden." };
  }
  if (ctx.profile.role === "viewer") {
    return { ok: false, error: "Viewers cannot edit data." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("monthly_records").upsert(
    {
      org_id: parsed.data.orgId,
      year: parsed.data.year,
      month: parsed.data.month,
      starting_hc: parsed.data.startingHc,
      new_hires: parsed.data.newHires,
      departures: parsed.data.departures,
    },
    { onConflict: "org_id,year,month" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/data-entry");
  return { ok: true };
}

export async function resetMonthlyRecordsAction(
  orgId: string
): Promise<MonthlyActionResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== orgId) return { ok: false, error: "Forbidden." };
  if (ctx.profile.role === "viewer") {
    return { ok: false, error: "Viewers cannot reset data." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("monthly_records").delete().eq("org_id", orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/data-entry");
  return { ok: true };
}

export async function addNextMonthAction(orgId: string): Promise<MonthlyActionResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== orgId) return { ok: false, error: "Forbidden." };
  if (ctx.profile.role === "viewer") {
    return { ok: false, error: "Viewers cannot edit data." };
  }

  const rows = await listMonthlyRecordsForOrg(orgId);
  let y = new Date().getFullYear();
  let m = new Date().getMonth();
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (!last) return { ok: false, error: "Invalid state." };
    const d = new Date(last.year, last.month + 1, 1);
    y = d.getFullYear();
    m = d.getMonth();
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("monthly_records").insert({
    org_id: orgId,
    year: y,
    month: m,
    starting_hc: null,
    new_hires: 0,
    departures: 0,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That month already exists." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/data-entry");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Seed trailing 12 months with null starting HC when org has no monthly rows yet. */
export async function bootstrapMonthlyTrailAction(
  orgId: string
): Promise<MonthlyActionResult> {
  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== orgId) return { ok: false, error: "Forbidden." };
  if (ctx.profile.role === "viewer") {
    return { ok: false, error: "Viewers cannot edit data." };
  }

  const existing = await listMonthlyRecordsForOrg(orgId);
  if (existing.length > 0) return { ok: true };

  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const batch = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    batch.push({
      org_id: orgId,
      year: d.getFullYear(),
      month: d.getMonth(),
      starting_hc: null,
      new_hires: 0,
      departures: 0,
    });
  }

  const { error } = await supabase.from("monthly_records").insert(batch);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/data-entry");
  revalidatePath("/dashboard");
  return { ok: true };
}
