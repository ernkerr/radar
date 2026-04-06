// AppNav -- the top navigation bar rendered on every authenticated page.
// Contains the app logo, primary navigation links, user email, and sign-out button.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Settings, Bell, ShieldCheck, Zap, LogOut } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

// Navigation items for the main app sections. Each entry maps a URL path to a
// label and icon. The Config route also covers /config/ingestion (child routes).
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Radar },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/actions", label: "Actions", icon: Zap },
  { href: "/config", label: "Config", icon: Settings },
];

export function AppNav() {
  // usePathname returns the current route path (e.g. "/alerts") so we can
  // highlight the active nav item.
  const pathname = usePathname();
  // useAuth provides the current user (for showing email) and a signOut
  // function that clears the Supabase session and redirects to /login.
  const { user, signOut } = useAuth();

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
              // Active route detection: uses startsWith so that child routes
              // (e.g. /config/ingestion) also highlight the parent nav item.
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
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="text-xs text-[var(--muted-foreground)]">{user.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
