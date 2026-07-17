import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/agents", label: "Agents", icon: "⬢" },
  { href: "/approvals", label: "Approvals", icon: "✓" },
  { href: "/memory", label: "Memory", icon: "◈" },
  { href: "/projects", label: "Projects", icon: "▤" },
  { href: "/simulate", label: "Simulate", icon: "⇶" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-edge bg-panel/60 p-4 flex flex-col gap-1">
        <div className="mb-6 px-2">
          <div className="text-lg font-bold text-white">Personal AI OS</div>
          <div className="text-xs text-slate-400">v1.0 · private alpha</div>
        </div>
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-edge hover:text-white transition"
          >
            <span className="text-accent">{n.icon}</span> {n.label}
          </Link>
        ))}
        <div className="mt-auto">
          <LogoutButton />
          <div className="px-2 pt-2 text-[10px] text-slate-500">
            Human authority is final. All risky actions require your approval.
          </div>
        </div>
      </aside>
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}
