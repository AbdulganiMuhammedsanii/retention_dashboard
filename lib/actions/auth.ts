"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadAllowlist, lookupAllowlist } from "@/lib/allowlist";
import { getServerEnv } from "@/lib/env";

const credsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New password and confirmation must match.",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must differ from the current one.",
    path: ["newPassword"],
  });

function readCreds(
  formData: FormData
): { ok: true; email: string; password: string } | { ok: false; error: string } {
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input" };
  }
  return { ok: true, email: parsed.data.email, password: parsed.data.password };
}

function checkAllowlist(
  email: string
):
  | { ok: true; orgId: string; role: "owner" | "admin" | "viewer" }
  | { ok: false; error: string } {
  try {
    const entry = lookupAllowlist(loadAllowlist(getServerEnv()), email);
    if (!entry) {
      return {
        ok: false,
        error: "Access requires an invitation. Contact your administrator.",
      };
    }
    return { ok: true, orgId: entry.orgId, role: entry.role };
  } catch {
    return {
      ok: false,
      error: "Server allowlist is misconfigured. Contact your administrator.",
    };
  }
}

async function ensureProfile(
  userId: string,
  email: string,
  orgId: string,
  role: "owner" | "admin" | "viewer"
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) {
    console.error("[auth] allowlist org_id missing in public.organizations", {
      orgId,
      email,
    });
    return;
  }
  await admin
    .from("profiles")
    .upsert({ id: userId, org_id: orgId, email, role }, { onConflict: "id" });
}

export async function signInAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const creds = readCreds(formData);
  if (!creds.ok) return creds;

  const allow = checkAllowlist(creds.email);
  if (!allow.ok) return allow;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (error) {
    return { ok: false, error: "Wrong email or password." };
  }

  await ensureProfile(data.user.id, creds.email, allow.orgId, allow.role);
  redirect("/dashboard");
}

export async function signUpAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const creds = readCreds(formData);
  if (!creds.ok) return creds;

  const allow = checkAllowlist(creds.email);
  if (!allow.ok) return allow;

  const admin = createAdminSupabaseClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: creds.email,
    password: creds.password,
    email_confirm: true,
  });

  if (createError && !/already|registered|exist/i.test(createError.message)) {
    return { ok: false, error: createError.message };
  }

  const supabase = await createServerSupabaseClient();
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (signInError) {
    return {
      ok: false,
      error: "Account already exists with a different password. Use Sign in instead.",
    };
  }

  await ensureProfile(signIn.user.id, creds.email, allow.orgId, allow.role);
  redirect("/dashboard");
}

function resolveOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (env && /^https?:\/\//i.test(env)) return env;
  return "http://localhost:3000";
}

export async function forgotPasswordAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = z
    .string()
    .email("Enter a valid email address.")
    .safeParse(formData.get("email"));
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const email = parsed.data;

  // Generic response either way — avoid leaking whether the email is registered/allowed.
  const generic: AuthActionResult = {
    ok: true,
    message:
      "If that email is on the invite list, we sent a reset link. Check your inbox (and spam).",
  };

  const allow = checkAllowlist(email);
  if (!allow.ok) return generic;

  const supabase = await createServerSupabaseClient();
  const origin = resolveOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
  });
  if (error) {
    console.error("[auth] resetPasswordForEmail failed", {
      email,
      message: error.message,
    });
  }
  return generic;
}

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export async function resetPasswordAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      ok: false,
      error: "Reset link expired or already used. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  redirect("/dashboard");
}

export async function changePasswordAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    return { ok: false, error: "You must be signed in." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true, message: "Password updated." };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
