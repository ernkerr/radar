"use client";

import { AppNav } from "@/components/layout/AppNav";

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Alerts</h1>
        <div className="bg-white rounded-lg border border-[var(--border)] p-6">
          <p className="text-[var(--muted-foreground)]">No alerts yet. Alerts will appear here once data sources are connected and changes are detected.</p>
        </div>
      </main>
    </div>
  );
}
