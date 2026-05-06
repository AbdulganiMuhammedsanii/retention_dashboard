export function Logo() {
  return (
    <div className="flex items-center gap-3.5">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold shadow-[0_0_24px_var(--rust-glow)]"
        style={{
          background: "linear-gradient(135deg, var(--rust) 0%, var(--rust-soft) 100%)",
          fontFamily: "var(--font-bricolage), serif",
          color: "var(--bg)",
        }}
      >
        WT
      </div>
      <div>
        <div
          className="mb-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)]"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Manzanita Security · Operations
        </div>
        <div
          className="text-[26px] font-medium leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), serif" }}
        >
          WatchTower
        </div>
      </div>
    </div>
  );
}
