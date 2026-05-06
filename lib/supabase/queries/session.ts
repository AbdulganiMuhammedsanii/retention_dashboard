import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrganizationById } from "@/lib/supabase/queries/organizations";
import { getProfileByUserId } from "@/lib/supabase/queries/profiles";
import type { OrganizationRow, ProfileRow } from "@/lib/types/domain";
import type { User } from "@supabase/supabase-js";

export type PortalContext = {
  user: User;
  profile: ProfileRow;
  org: OrganizationRow;
};

export async function getPortalContext(): Promise<PortalContext | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  const org = await getOrganizationById(profile.org_id);
  if (!org) return null;

  return { user, profile, org };
}
