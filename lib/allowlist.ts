import { z } from "zod";
import type { Env } from "@/lib/env";
import type { UserRole } from "@/lib/types/domain";

export type AllowlistEntry = { orgId: string; role: UserRole };

/**
 * Comma-, semicolon-, or newline-separated work emails.
 * Everyone gets the same org + role (Phase 1).
 */
export function loadAllowlist(env: Env): Record<string, AllowlistEntry> {
  const parts = env.ALLOWLIST_EMAILS.split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error("ALLOWLIST_EMAILS has no addresses");
  }
  const out: Record<string, AllowlistEntry> = {};
  for (const raw of parts) {
    const email = z.string().email().parse(raw.toLowerCase());
    if (out[email]) continue;
    out[email] = { orgId: env.ALLOWLIST_ORG_ID, role: env.ALLOWLIST_ROLE };
  }
  return out;
}

export function lookupAllowlist(
  map: Record<string, AllowlistEntry>,
  email: string
): AllowlistEntry | null {
  const key = email.trim().toLowerCase();
  const entry = map[key];
  return entry ?? null;
}
