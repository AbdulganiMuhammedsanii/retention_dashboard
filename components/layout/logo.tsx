import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/manzanita_logo.png"
        alt="Manzanita Security"
        width={200}
        height={40}
        className="h-10 w-auto max-h-10 shrink-0 object-contain object-left"
        sizes="(max-width: 768px) 140px, 200px"
        priority
      />
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
