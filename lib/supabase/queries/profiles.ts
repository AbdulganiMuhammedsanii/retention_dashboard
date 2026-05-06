import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types/domain";

export async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProfileRow | null;
}
