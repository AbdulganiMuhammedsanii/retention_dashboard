import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MonthlyRecordRow } from "@/lib/types/domain";

export async function listMonthlyRecordsForOrg(
  orgId: string
): Promise<MonthlyRecordRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("monthly_records")
    .select("*")
    .eq("org_id", orgId)
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  if (error) throw new Error(error.message);
  return data as MonthlyRecordRow[];
}
