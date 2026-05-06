import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/supabase/queries/session";

export default async function HomePage() {
  const ctx = await getPortalContext();
  if (ctx) redirect("/dashboard");
  redirect("/login");
}
