import { type NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { lookupAllowlist, parseAllowlistJson } from "@/lib/allowlist";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";

const EMAIL_OTP_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Resolve the public origin we should use for browser-facing redirects.
 *
 * Behind a proxy (Railway, Vercel, Fly, etc.) `request.url` can resolve to the
 * container's internal `localhost:<PORT>`, which would send the user there.
 * Prefer an explicit env (`NEXT_PUBLIC_SITE_URL`), then standard forwarded
 * headers, then the request URL as a last resort.
 */
function resolvePublicOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (env && /^https?:\/\//i.test(env)) {
    return env;
  }

  const xfHost = request.headers.get("x-forwarded-host");
  const xfProto = request.headers.get("x-forwarded-proto");
  if (xfHost) {
    const proto = xfProto ?? (xfHost.startsWith("localhost") ? "http" : "https");
    return `${proto}://${xfHost}`;
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader && !hostHeader.startsWith("localhost:")) {
    const proto = xfProto ?? "https";
    return `${proto}://${hostHeader}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = resolvePublicOrigin(request);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  const hasPkceCode = Boolean(code);
  const hasTokenHash =
    Boolean(token_hash) && Boolean(type) && EMAIL_OTP_TYPES.has(type ?? "");

  if (!hasPkceCode && !hasTokenHash) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const redirectTarget = new URL(next, origin);
  const supabaseResponse = NextResponse.redirect(redirectTarget);

  const supabase = createRouteHandlerSupabaseClient(request, supabaseResponse);

  if (hasPkceCode && code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(new URL("/login?error=auth", origin));
    }
  } else if (hasTokenHash && token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as
        | "signup"
        | "invite"
        | "magiclink"
        | "recovery"
        | "email_change"
        | "email",
    });
    if (verifyError) {
      return NextResponse.redirect(new URL("/login?error=auth", origin));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return supabaseResponse;
  }

  let allowlist: ReturnType<typeof parseAllowlistJson>;
  try {
    allowlist = parseAllowlistJson(getServerEnv().ALLOWLIST_JSON);
  } catch {
    const denied = NextResponse.redirect(new URL("/login?error=config", origin));
    const sb = createRouteHandlerSupabaseClient(request, denied);
    await sb.auth.signOut();
    return denied;
  }

  const entry = lookupAllowlist(allowlist, user.email);
  if (!entry) {
    const denied = NextResponse.redirect(new URL("/login?error=not_invited", origin));
    const sb = createRouteHandlerSupabaseClient(request, denied);
    await sb.auth.signOut();
    return denied;
  }

  const admin = createAdminSupabaseClient();

  const { data: orgRow, error: orgLookupError } = await admin
    .from("organizations")
    .select("id")
    .eq("id", entry.orgId)
    .maybeSingle();

  if (orgLookupError || !orgRow) {
    console.error("[auth/callback] allowlist org_id missing in public.organizations", {
      orgId: entry.orgId,
      email: user.email,
      orgLookupError,
    });
    const denied = NextResponse.redirect(new URL("/login?error=missing_org", origin));
    const sb = createRouteHandlerSupabaseClient(request, denied);
    await sb.auth.signOut();
    return denied;
  }

  const { error: insertError } = await admin.from("profiles").insert({
    id: user.id,
    org_id: entry.orgId,
    email: user.email,
    role: entry.role,
    full_name: (() => {
      const m: unknown = user.user_metadata;
      if (!m || typeof m !== "object") return null;
      const fn = (m as Record<string, unknown>).full_name;
      return typeof fn === "string" ? fn : null;
    })(),
  });

  if (insertError) {
    // Parallel callbacks or double navigation can race; profile already exists.
    if (insertError.code === "23505") {
      return supabaseResponse;
    }
    console.error("[auth/callback] profiles insert failed", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      userId: user.id,
      orgId: entry.orgId,
    });
    const denied = NextResponse.redirect(new URL("/login?error=bootstrap", origin));
    const sb = createRouteHandlerSupabaseClient(request, denied);
    await sb.auth.signOut();
    return denied;
  }

  return supabaseResponse;
}
