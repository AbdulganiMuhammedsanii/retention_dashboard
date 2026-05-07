import { AccountForm } from "./account-form";

export default function AccountPage() {
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
        <AccountForm />
      </div>
    </div>
  );
}
