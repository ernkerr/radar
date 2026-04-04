"use client";

import { AppNav } from "@/components/layout/AppNav";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Active Alerts</h2>
            <p className="text-3xl font-semibold">—</p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Pending Actions</h2>
            <p className="text-3xl font-semibold">—</p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Sources Monitored</h2>
            <p className="text-3xl font-semibold">—</p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Ingested Documents</h2>
          <div className="bg-white rounded-lg border border-[var(--border)] p-6">
            <p className="text-[var(--muted-foreground)]">No documents ingested yet. Connect your first data source to get started.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
