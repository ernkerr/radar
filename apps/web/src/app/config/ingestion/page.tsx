// Ingestion monitor page -- shows the health and history of data ingestion runs.
// This page reads from two global (non-company-scoped) tables:
// - sources: the list of regulatory data feeds (FDA, NOAA, etc.)
// - ingestion_log: a record of each scraper/fetcher run with status, timing, and counts
// These tables have no company_id column because ingestion is shared infrastructure --
// the same sources are scraped once and the resulting documents are analyzed
// per-company by the alert pipeline.
"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";

// Matches the ingestion_log table schema. Each row represents one scraper run.
type IngestionRun = {
  id: string;
  source_id: string;
  status: "success" | "failure";
  error_message: string | null;
  duration_ms: number | null;
  records_fetched: number;
  ran_at: string;
};

// Matches the sources table schema (subset of columns used here).
type Source = {
  id: string;
  name: string;
  source_type: string;
  status: string;
  last_checked: string | null;
};

export default function IngestionMonitorPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  // When a source card is clicked, selectedSource is set to that source's ID
  // to filter the run history table below. Clicking again deselects (shows all).
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Fetches both tables in parallel. No company_id filter is applied because
  // sources and ingestion_log are global/shared tables.
  async function loadData() {
    setLoading(true);
    const [sourcesRes, runsRes] = await Promise.all([
      supabase.from("sources").select("*").order("name"),
      supabase.from("ingestion_log").select("*").order("ran_at", { ascending: false }).limit(100),
    ]);
    if (sourcesRes.data) setSources(sourcesRes.data);
    if (runsRes.data) setRuns(runsRes.data);
    setLoading(false);
  }

  // Client-side filtering: if a source card is selected, only show that source's runs.
  const filteredRuns = selectedSource
    ? runs.filter((r) => r.source_id === selectedSource)
    : runs;

  // Helper to resolve a source_id to its human-readable name for the table.
  const getSourceName = (id: string) =>
    sources.find((s) => s.id === id)?.name ?? id;

  // Computes per-source statistics from the loaded runs for the source cards.
  // Counts successes, failures, total runs, and identifies the most recent run
  // (runs are already sorted by ran_at desc, so [0] is the latest).
  const getSourceStats = (sourceId: string) => {
    const sourceRuns = runs.filter((r) => r.source_id === sourceId);
    const lastRun = sourceRuns[0];
    const successCount = sourceRuns.filter((r) => r.status === "success").length;
    const failCount = sourceRuns.filter((r) => r.status === "failure").length;
    return { lastRun, successCount, failCount, total: sourceRuns.length };
  };

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/config" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-semibold">Ingestion Monitor</h1>
          <button
            onClick={loadData}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-[var(--muted-foreground)]">Loading...</div>
        ) : (
          <>
            {/* Source cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {sources.map((source) => {
                const stats = getSourceStats(source.id);
                const isSelected = selectedSource === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(isSelected ? null : source.id)}
                    className={`text-left bg-white rounded-lg border p-4 transition-colors ${
                      isSelected
                        ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                        : "border-[var(--border)] hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{source.name}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        source.status === "active"
                          ? "bg-green-100 text-green-700"
                          : source.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">{source.source_type}</p>
                    {stats.total > 0 ? (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> {stats.successCount}
                        </span>
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-3 h-3" /> {stats.failCount}
                        </span>
                        {stats.lastRun && (
                          <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                            <Clock className="w-3 h-3" />
                            {new Date(stats.lastRun.ran_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)]">No runs yet</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Run history table */}
            <h2 className="text-lg font-semibold mb-3">
              Run History
              {selectedSource && (
                <span className="text-sm font-normal text-[var(--muted-foreground)]">
                  {" "}— {getSourceName(selectedSource)}
                </span>
              )}
            </h2>
            <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] grid grid-cols-5 text-xs font-medium text-[var(--muted-foreground)]">
                <span>Source</span>
                <span>Status</span>
                <span>Records</span>
                <span>Duration</span>
                <span>Time</span>
              </div>
              {filteredRuns.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  No ingestion runs recorded yet.
                </div>
              ) : (
                filteredRuns.map((run) => (
                  <div
                    key={run.id}
                    className="px-4 py-3 border-b border-[var(--border)] last:border-b-0 grid grid-cols-5 text-sm items-center"
                  >
                    <span className="font-medium">{getSourceName(run.source_id)}</span>
                    <span>
                      {run.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium" title={run.error_message ?? ""}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </span>
                    <span className="text-[var(--muted-foreground)]">{run.records_fetched}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {run.duration_ms != null ? `${run.duration_ms}ms` : "—"}
                    </span>
                    <span className="text-[var(--muted-foreground)] text-xs">
                      {new Date(run.ran_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
