"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Settings, Bell, ShieldCheck, Zap } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Radar },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/actions", label: "Actions", icon: Zap },
  { href: "/config", label: "Config", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            <span className="font-semibold text-lg">Radar</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
