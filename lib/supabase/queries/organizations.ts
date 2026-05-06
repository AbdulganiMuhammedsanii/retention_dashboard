import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OrganizationRow } from "@/lib/types/domain";

export async function getOrganizationById(
  orgId: string
): Promise<OrganizationRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OrganizationRow | null;
}
