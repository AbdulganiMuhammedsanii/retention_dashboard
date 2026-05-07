import { LoginForm } from "./login-form";

const urlErrors: Record<string, string> = {
  not_invited: "Access requires an invitation. Contact your administrator.",
  auth: "Sign-in failed or link expired. Request a new magic link.",
  bootstrap:
    "Could not create your workspace profile. An administrator should check server logs and confirm the invitation’s organization exists in the database.",
  missing_org:
    "Your invitation references an organization that is not in the database yet. Run the seed SQL (or create that org), or fix ALLOWLIST_ORG_ID to match Postgres.",
  config: "Server allowlist is misconfigured. Contact your administrator.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const urlError = sp.error
    ? (urlErrors[sp.error] ?? "Something went wrong.")
    : undefined;

  return (
    <div
      className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 p-1 shadow-2xl backdrop-blur-sm"
      style={{
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <div
        className="rounded-[14px] px-4 py-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(234, 88, 12, 0.12) 0%, transparent 55%)",
        }}
      >
        <LoginForm urlError={urlError} />
      </div>
    </div>
  );
}
