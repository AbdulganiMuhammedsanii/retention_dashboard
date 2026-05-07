import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?error=auth");

  return (
    <div
      className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-1 shadow-2xl backdrop-blur-sm"
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03)" }}
    >
      <div
        className="rounded-[14px] px-4 py-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(234, 88, 12, 0.12) 0%, transparent 55%)",
        }}
      >
        <ResetPasswordForm email={user.email} />
      </div>
    </div>
  );
}
