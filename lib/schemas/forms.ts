import { z } from "zod";

export const loginEmailSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const monthlyUpsertSchema = z.object({
  orgId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(0).max(11),
  /** null = not entered (matches prototype empty starting HC cell). */
  startingHc: z.number().int().min(0).nullable(),
  newHires: z.number().int().min(0),
  departures: z.number().int().min(0),
});

export const orgNameUpdateSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(200),
});

export const replacementCostSchema = z.object({
  orgId: z.string().uuid(),
  /** Whole dollars, e.g. 3500 */
  replacementCostDollars: z.number().int().min(0).max(1_000_000),
});

export const siteUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(200),
  startingHc: z.number().int().min(0),
  departures: z.number().int().min(0),
  active: z.boolean().optional(),
});
