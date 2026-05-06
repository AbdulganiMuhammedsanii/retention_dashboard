"use server";

import { revalidatePath } from "next/cache";
import { orgNameUpdateSchema, replacementCostSchema } from "@/lib/schemas/forms";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/supabase/queries/session";

export type SettingsActionResult = { ok: true } | { ok: false; error: string };

export async function updateOrganizationNameAction(
  input: unknown
): Promise<SettingsActionResult> {
  const parsed = orgNameUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid organization name." };
  }

  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== parsed.data.orgId) {
    return { ok: false, error: "Forbidden." };
  }
  if (ctx.profile.role !== "owner") {
    return { ok: false, error: "Only owners can rename the organization." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateReplacementCostAction(
  input: unknown
): Promise<SettingsActionResult> {
  const parsed = replacementCostSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid replacement cost." };
  }

  const ctx = await getPortalContext();
  if (!ctx) return { ok: false, error: "Not authenticated." };
  if (ctx.profile.org_id !== parsed.data.orgId) {
    return { ok: false, error: "Forbidden." };
  }
  if (ctx.profile.role === "viewer") {
    return { ok: false, error: "Viewers cannot edit billing fields." };
  }

  const cents = parsed.data.replacementCostDollars * 100;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("organizations")
    .update({ replacement_cost_cents: cents })
    .eq("id", parsed.data.orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateOrganizationNameFromForm(
  formData: FormData
): Promise<void> {
  const ctx = await getPortalContext();
  if (!ctx) return;
  const raw = formData.get("orgName");
  const name = typeof raw === "string" ? raw : "";
  await updateOrganizationNameAction({
    orgId: ctx.profile.org_id,
    name,
  });
}

export async function updateReplacementCostFromForm(formData: FormData): Promise<void> {
  const ctx = await getPortalContext();
  if (!ctx) return;
  const raw = formData.get("replacementCostDollars");
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  await updateReplacementCostAction({
    orgId: ctx.profile.org_id,
    replacementCostDollars: Number.isFinite(n) ? n : 0,
  });
}
