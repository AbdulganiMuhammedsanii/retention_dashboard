import { z } from "zod";
import type { UserRole } from "@/lib/types/domain";

const roleSchema = z.enum(["owner", "admin", "viewer"]);

const allowlistSchema = z.record(
  z.string().email(),
  z.object({
    orgId: z.string().uuid(),
    role: roleSchema,
  })
);

export type AllowlistEntry = { orgId: string; role: UserRole };

export function parseAllowlistJson(raw: string): Record<string, AllowlistEntry> {
  const data: unknown = JSON.parse(raw);
  const parsed = allowlistSchema.parse(data);
  const out: Record<string, AllowlistEntry> = {};
  for (const [email, entry] of Object.entries(parsed)) {
    out[email.trim().toLowerCase()] = entry;
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
