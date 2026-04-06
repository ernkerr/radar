"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";

type Alert = {
  id: string;
  title: string;
  summary: string;
  why_it_matters: string;
  relevance_score: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  matched_rules: string[];
  llm_reasoning: string | null;
  status: "new" | "acknowledged" | "resolved";
  created_at: string;
};

const urgencyColors = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-gray-100 text-gray-600",
};

const statusColors = {
  new: "bg-blue-100 text-blue-700",
  acknowledged: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ urgency: string; status: string }>({ urgency: "all", status: "all" });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setAlerts(data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("alerts").update({ status }).eq("id", id);
    load();
  }

  const filtered = alerts.filter((a) => {
    if (filter.urgency !== "all" && a.urgency !== filter.urgency) return false;
    if (filter.status !== "all" && a.status !== filter.status) return false;
    return true;
  });

  const counts = {
    HIGH: alerts.filter((a) => a.urgency === "HIGH").length,
    MEDIUM: alerts.filter((a) => a.urgency === "MEDIUM").length,
    LOW: alerts.filter((a) => a.urgency === "LOW").length,
    new: alerts.filter((a) => a.status === "new").length,
  };

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Alerts</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{counts.new} new, {alerts.length} total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {["all", "HIGH", "MEDIUM", "LOW"].map((u) => (
            <button
              key={u}
              onClick={() => setFilter({ ...filter, urgency: u })}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter.urgency === u ? "bg-[var(--foreground)] text-white" : "bg-white border border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {u === "all" ? "All" : u} {u !== "all" && `(${counts[u as keyof typeof counts]})`}
            </button>
          ))}
          <span className="mx-2 text-[var(--border)]">|</span>
          {["all", "new", "acknowledged", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter({ ...filter, status: s })}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter.status === s ? "bg-[var(--foreground)] text-white" : "bg-white border border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Alert list */}
        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No alerts match your filters.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alert) => (
              <div key={alert.id} className="bg-white rounded-lg border border-[var(--border)]">
                <button
                  onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                >
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyColors[alert.urgency]}`}>
                    {alert.urgency}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{alert.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[alert.status]}`}>
                    {alert.status}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                  {expanded === alert.id ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />}
                </button>

                {expanded === alert.id && (
                  <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
                    {alert.why_it_matters && (
                      <div>
                        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Why it matters</p>
                        <p className="text-sm">{alert.why_it_matters}</p>
                      </div>
                    )}
                    {alert.matched_rules.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Matched rules</p>
                        <div className="flex gap-1 flex-wrap">
                          {alert.matched_rules.map((r) => (
                            <span key={r} className="text-xs bg-[var(--muted)] px-2 py-0.5 rounded">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {alert.summary && (
                      <div>
                        <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Summary</p>
                        <p className="text-xs text-[var(--muted-foreground)] whitespace-pre-wrap">{alert.summary.slice(0, 300)}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {alert.status === "new" && (
                        <button onClick={() => updateStatus(alert.id, "acknowledged")} className="text-xs font-medium px-3 py-1 bg-[var(--muted)] rounded hover:bg-gray-200">
                          Acknowledge
                        </button>
                      )}
                      {alert.status !== "resolved" && (
                        <button onClick={() => updateStatus(alert.id, "resolved")} className="text-xs font-medium px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
