import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SiteRow } from "@/lib/types/domain";

export async function listSitesForOrg(orgId: string): Promise<SiteRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sites_ops")
    .select("*")
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data as SiteRow[];
}
