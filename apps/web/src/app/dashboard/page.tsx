"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ alerts: 0, actions: 0, sources: 0 });
  const [documents, setDocuments] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!user) return;

    // Get company name
    supabase
      .from("users")
      .select("company_id, companies(name)")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.companies?.name) setCompanyName(data.companies.name);
      });

    // Get source count
    supabase
      .from("sources")
      .select("id", { count: "exact" })
      .then(({ count }) => {
        setStats((s) => ({ ...s, sources: count || 0 }));
      });

    // Get recent documents with source name
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-[var(--border)] p-6">
      <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-1">{label}</h2>
      <p className="text-3xl font-semibold">{value}</p>
    </div>
  );
}
