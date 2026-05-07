"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadAllowlist, lookupAllowlist } from "@/lib/allowlist";
import { getServerEnv } from "@/lib/env";

const credsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
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
  const parsed = credsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input" };
  }

  const allow = checkAllowlist(parsed.data.email);
  if (!allow.ok) return allow;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, error: "Wrong email or password." };
  }

  await ensureProfile(data.user.id, parsed.data.email, allow.orgId, allow.role);
  redirect("/dashboard");
}

const emailSchema = z.string().email("Enter a valid email address.");
const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6,8}$/u, "Enter the code from the email.");
const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

/**
 * Step 1 — send a 6-digit OTP to the email.
 * Creates the auth user if it doesn't exist (email_confirm happens at OTP verify).
 */
export async function requestEmailCodeAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }
  const email = parsed.data;

  const allow = checkAllowlist(email);
  if (!allow.ok) return allow;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    message: "We sent a code to your email. It expires in 1 hour.",
  };
}

/**
 * Step 2 — verify the 6-digit OTP. Establishes a Supabase session and
 * upserts the portal profile so RLS works.
 */
export async function verifyEmailCodeAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  const parsedToken = otpSchema.safeParse(formData.get("token"));
  if (!parsedEmail.success) {
    return { ok: false, error: "Start over: invalid email." };
  }
  if (!parsedToken.success) {
    return {
      ok: false,
      error: parsedToken.error.issues[0]?.message ?? "Invalid code",
    };
  }
  const email = parsedEmail.data;
  const token = parsedToken.data;

  const allow = checkAllowlist(email);
  if (!allow.ok) return allow;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error || !data.user) {
    return { ok: false, error: "Code is invalid or expired. Send a new one." };
  }

  await ensureProfile(data.user.id, email, allow.orgId, allow.role);
  return { ok: true, message: "Email verified." };
}

/**
 * Step 3 — finalize: set (or replace) the password while signed in via OTP.
 * Used both for first-time setup and for forgot-password reset.
 */
export async function setPasswordAndContinueAction(
  _prev: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = newPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      ok: false,
      error: "Session expired. Start over from the email step.",
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
