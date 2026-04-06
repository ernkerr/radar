"use client";

import { AppNav } from "@/components/layout/AppNav";

export default function ActionsPage() {
  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Actions</h1>
        <div className="bg-white rounded-lg border border-[var(--border)] p-6">
          <p className="text-[var(--muted-foreground)]">No pending actions. Actions requiring approval will appear here.</p>
        </div>
      </main>
    </div>
  );
}
