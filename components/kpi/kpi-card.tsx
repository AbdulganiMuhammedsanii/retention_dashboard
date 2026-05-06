type KpiVariant = "primary" | "default" | "warning" | "positive";

const stripe: Record<KpiVariant, string> = {
  primary: "var(--rust-soft)",
  default: "var(--border-strong)",
  warning: "var(--amber)",
  positive: "var(--green)",
};

export function KpiCard({
  label,
  variant = "default",
  value,
  detail,
}: {
  label: string;
  variant?: KpiVariant;
  value: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] px-6 py-[22px]"
      style={{
        boxShadow: "inset 3px 0 0 0 " + stripe[variant],
      }}
    >
      <div
        className="mb-3 text-[10px] uppercase tracking-[0.15em] text-[var(--text-faint)]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {label}
      </div>
      <div
        className="text-[38px] font-medium leading-none tracking-tight text-[var(--text)]"
        style={{ fontFamily: "var(--font-bricolage), serif" }}
      >
        {value}
      </div>
      <div
        className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {detail}
      </div>
    </div>
  );
}
