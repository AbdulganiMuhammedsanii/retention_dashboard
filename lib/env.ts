import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Comma / semicolon / newline separated emails allowed to sign in. */
  ALLOWLIST_EMAILS: z.string().min(1),
  /** Must match a row in `public.organizations` (see seed.sql). */
  ALLOWLIST_ORG_ID: z.string().uuid(),
  /** Role for every allowlisted email; default owner when unset or empty. */
  ALLOWLIST_ROLE: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : "owner"),
    z.enum(["owner", "admin", "viewer"])
  ),
});

export type Env = z.infer<typeof envSchema>;

export function getServerEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ALLOWLIST_EMAILS: process.env.ALLOWLIST_EMAILS,
    ALLOWLIST_ORG_ID: process.env.ALLOWLIST_ORG_ID,
    ALLOWLIST_ROLE: process.env.ALLOWLIST_ROLE,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid environment variables. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ALLOWLIST_EMAILS, ALLOWLIST_ORG_ID (optional: ALLOWLIST_ROLE)"
    );
  }
  return parsed.data;
}
