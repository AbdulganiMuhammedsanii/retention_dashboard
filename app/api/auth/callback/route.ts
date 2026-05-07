import { type NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { loadAllowlist, lookupAllowlist } from "@/lib/allowlist";
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
 * Behind a proxy (Railway, Vercel, ...) `request.url` can resolve to the
 * container's internal `localhost:<PORT>`. Use a public origin we trust.
 */
function resolvePublicOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (env && /^https?:\/\//i.test(env)) return env;

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

  const successResponse = NextResponse.redirect(new URL(next, origin));
  const supabase = createRouteHandlerSupabaseClient(request, successResponse);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth", origin));
    }
  } else if (token_hash && type && EMAIL_OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as
        | "signup"
        | "invite"
        | "magiclink"
        | "recovery"
        | "email_change"
        | "email",
    });
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth", origin));
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  try {
    const entry = lookupAllowlist(loadAllowlist(getServerEnv()), user.email);
    if (!entry) {
      const denied = NextResponse.redirect(new URL("/login?error=not_invited", origin));
      const sb = createRouteHandlerSupabaseClient(request, denied);
      await sb.auth.signOut();
      return denied;
    }
  } catch {
    const denied = NextResponse.redirect(new URL("/login?error=config", origin));
    const sb = createRouteHandlerSupabaseClient(request, denied);
    await sb.auth.signOut();
    return denied;
  }

  return successResponse;
}
