import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/data-entry", label: "Data entry" },
  { href: "/sites", label: "Sites" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)] px-3 py-6">
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--panel-elevated)] hover:text-[var(--text)]"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
