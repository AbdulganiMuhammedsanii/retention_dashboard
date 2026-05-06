import { redirect } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { getPortalContext } from "@/lib/supabase/queries/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-4 md:px-6">
          <span
            className="truncate text-xs text-[var(--text-muted)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            {ctx.profile.email} · {ctx.profile.role}
          </span>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-[var(--text-muted)]"
            >
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
