// Dashboard page -- the main landing view after login.
// Displays summary stats (active alerts, pending actions, monitored sources)
// and a table of recently ingested documents.
"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { user } = useAuth();
  // Stats holds the three summary counts shown in the stat cards.
  const [stats, setStats] = useState({ alerts: 0, actions: 0, sources: 0 });
  // Recent raw_documents rows joined with their source name.
  const [documents, setDocuments] = useState<any[]>([]);
  // The company name displayed beneath the page title.
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    // Wait until the auth hook resolves the current user before querying.
    if (!user) return;

    // Look up the company name for the current user. This performs a join:
    // users -> companies via the company_id foreign key. Supabase's
    // `select("company_id, companies(name)")` syntax follows the FK
    // relationship and returns `{ companies: { name: "..." } }`.
    supabase
      .from("users")
      .select("company_id, companies(name)")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.companies?.name) setCompanyName(data.companies.name);
      });

    // Load the three summary counts in parallel. Each query uses
    // `{ count: "exact" }` to ask Postgres for a COUNT(*) without
    // returning full rows -- just the count value.
    // Sources count: total number of monitored data sources (no filter).
    supabase.from("sources").select("id", { count: "exact" }).then(({ count }) => {
      setStats((s) => ({ ...s, sources: count || 0 }));
    });
    // Alerts count: only alerts with status "new" (unacknowledged).
    supabase.from("alerts").select("id", { count: "exact" }).eq("status", "new").then(({ count }) => {
      setStats((s) => ({ ...s, alerts: count || 0 }));
    });
    // Actions count: only actions awaiting human approval.
    supabase.from("actions").select("id", { count: "exact" }).eq("status", "pending").then(({ count }) => {
      setStats((s) => ({ ...s, actions: count || 0 }));
    });

    // Fetch the 20 most recent raw_documents, joined with the source table
    // to get the human-readable source name (e.g. "NOAA Fisheries").
    // The `sources(name)` syntax tells Supabase to follow the source_id FK.
    supabase
      .from("raw_documents")
      .select("id, source_id, external_id, metadata_json, fetched_at, sources(name)")
      .order("fetched_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setDocuments(data);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
        {companyName && (
          <p className="text-sm text-[var(--muted-foreground)] mb-6">{companyName}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Active Alerts" value={stats.alerts} />
          <StatCard label="Pending Actions" value={stats.actions} />
          <StatCard label="Sources Monitored" value={stats.sources} />
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Ingested Documents</h2>
          <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] grid grid-cols-4 text-xs font-medium text-[var(--muted-foreground)]">
              <span>Source</span>
              <span className="col-span-2">Title / ID</span>
              <span>Fetched</span>
            </div>
            {documents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                No documents ingested yet.
              </div>
            ) : (
              documents.map((doc) => {
                // Extract a human-readable title from the document's metadata_json.
                // Different sources store titles under different keys, so we try
                // several common fields in priority order before falling back to
                // the external_id (the source's own identifier for this document).
                const meta = doc.metadata_json || {};
                const title = meta.title || meta.product_description || meta.label || doc.external_id || "—";
                return (
                  <div
                    key={doc.id}
                    className="px-4 py-3 border-b border-[var(--border)] last:border-b-0 grid grid-cols-4 text-sm items-center"
                  >
                    <span className="text-xs font-medium">
                      {(doc as any).sources?.name || doc.source_id}
                    </span>
                    <span className="col-span-2 truncate" title={typeof title === 'string' ? title : ''}>
                      {typeof title === 'string' ? title.slice(0, 100) : '—'}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date(doc.fetched_at).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Simple presentational card used for the three summary metrics at the top
// of the dashboard (Active Alerts, Pending Actions, Sources Monitored).
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-[var(--border)] p-6">
      <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-1">{label}</h2>
      <p className="text-3xl font-semibold">{value}</p>
    </div>
  );
}
