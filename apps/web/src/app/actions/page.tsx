"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/layout/AppNav";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Clock, ClipboardList, Mail, Database, ShieldAlert } from "lucide-react";

type Action = {
  id: string;
  action_type: "task" | "erp_update" | "outreach" | "hold";
  description: string;
  payload_json: Record<string, unknown>;
  requires_approval: boolean;
  status: "pending" | "approved" | "rejected" | "executing" | "completed" | "failed";
  created_at: string;
  alerts: { title: string; urgency: string } | null;
};

const typeIcons: Record<string, React.ElementType> = {
  task: ClipboardList,
  erp_update: Database,
  outreach: Mail,
  hold: ShieldAlert,
};

const typeLabels: Record<string, string> = {
  task: "Review Task",
  erp_update: "ERP Update",
  outreach: "Supplier Outreach",
  hold: "Inventory Hold",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  executing: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function ActionsPage() {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("actions")
      .select("*, alerts(title, urgency)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setActions(data as Action[]);
    setLoading(false);
  }

  async function approve(id: string) {
    await supabase.from("actions").update({ status: "approved" }).eq("id", id);
    if (user) {
      await supabase.from("approvals").insert({
        action_id: id,
        user_id: user.id,
        decision: "approved",
      });
    }
    load();
  }

  async function reject(id: string) {
    await supabase.from("actions").update({ status: "rejected" }).eq("id", id);
    if (user) {
      await supabase.from("approvals").insert({
        action_id: id,
        user_id: user.id,
        decision: "rejected",
      });
    }
    load();
  }

  const filtered = statusFilter === "all"
    ? actions
    : actions.filter((a) => a.status === statusFilter);

  const pendingCount = actions.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Actions</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{pendingCount} pending approval</p>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 mb-4">
          {["pending", "approved", "rejected", "completed", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-[var(--foreground)] text-white" : "bg-white border border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-[var(--border)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No actions match this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((action) => {
              const Icon = typeIcons[action.action_type] || ClipboardList;
              return (
                <div key={action.id} className="bg-white rounded-lg border border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--muted)]">
                      {typeLabels[action.action_type] || action.action_type}
                    </span>
                    <span className="text-sm flex-1">{action.description}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[action.status]}`}>
                      {action.status}
                    </span>
                  </div>

                  {action.alerts && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-2 ml-7">
                      Alert: {action.alerts.title?.slice(0, 80)}
                    </p>
                  )}

                  {action.status === "pending" && (
                    <div className="flex gap-2 mt-3 ml-7">
                      <button onClick={() => approve(action.id)} className="flex items-center gap-1 text-xs font-medium px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => reject(action.id)} className="flex items-center gap-1 text-xs font-medium px-3 py-1 bg-red-100 text-red-500 rounded hover:bg-red-200">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
