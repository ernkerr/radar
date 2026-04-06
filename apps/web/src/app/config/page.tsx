// Config page -- lets users manage their company profile, suppliers, products,
// and view monitored sources. Each section is rendered as a tab.
// - CompanyConfig: reads/writes the companies table (name + settings_json)
// - SuppliersConfig: CRUD on the suppliers table (scoped by company_id)
// - ProductsConfig: CRUD on the products table (scoped by company_id)
// - SourcesConfig: read-only view of the global sources table (not company-scoped)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";
import { useAuth } from "@/lib/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Building2, Truck, Fish, Globe, Plus, Trash2 } from "lucide-react";

type Tab = "company" | "suppliers" | "products" | "sources";

// Tab definitions with icons. Each tab renders a different config sub-component.
const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "products", label: "Products", icon: Fish },
  { id: "sources", label: "Sources", icon: Globe },
];

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");
  const { user } = useAuth();
  // companyId is resolved from the authenticated user's record in the users
  // table. All company-scoped config tabs (company, suppliers, products) need
  // this ID to read/write the correct rows. Sources are global and don't need it.
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Look up the current user's company_id from the users table.
  // This runs once after the auth hook resolves the user.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setCompanyId(data.company_id);
      });
  }, [user]);

  // Don't render anything until we know the companyId -- the child components
  // all depend on it for their queries.
  if (!companyId) return null;

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <AppNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Configuration</h1>
        <div className="flex gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-6">
          {activeTab === "company" && <CompanyConfig companyId={companyId} />}
          {activeTab === "suppliers" && <SuppliersConfig companyId={companyId} />}
          {activeTab === "products" && <ProductsConfig companyId={companyId} />}
          {activeTab === "sources" && <SourcesConfig />}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// COMPANY
// ============================================================
// Reads and saves the company's name and settings_json to the companies table.
// settings_json stores freeform context (headquarters, regions, roles) that
// the analysis pipeline uses to determine which regulatory changes are relevant.

function CompanyConfig({ companyId }: { companyId: string }) {
  const [name, setName] = useState("");
  const [settings, setSettings] = useState({ headquarters: "", operating_regions: "", roles: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name);
          const s = data.settings_json as Record<string, string> || {};
          setSettings({
            headquarters: s.headquarters || "",
            operating_regions: s.operating_regions || "",
            roles: s.roles || "",
          });
        }
      });
  }, [companyId]);

  async function save() {
    setSaving(true);
    await supabase
      .from("companies")
      .update({ name, settings_json: settings })
      .eq("id", companyId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Company Information</h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        This context is used to determine which regulatory changes are relevant to you.
      </p>
      <div className="space-y-4 max-w-lg">
        <Field label="Company Name" value={name} onChange={setName} placeholder="e.g. Aquanor Ice Fresh" />
        <Field label="Headquarters" value={settings.headquarters} onChange={(v) => setSettings({ ...settings, headquarters: v })} placeholder="e.g. Boston, MA" />
        <Field label="Operating Regions" value={settings.operating_regions} onChange={(v) => setSettings({ ...settings, operating_regions: v })} placeholder="e.g. United States, Iceland, Canada" />
        <Field label="Roles" value={settings.roles} onChange={(v) => setSettings({ ...settings, roles: v })} placeholder="e.g. Producer, Importer, Distributor" />
        <button onClick={save} disabled={saving} className="bg-[var(--foreground)] text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SUPPLIERS
// ============================================================
// Full CRUD on the suppliers table, scoped to the current company_id.
// Supplier country and certifications are used by the analysis pipeline
// to match alerts against the user's supply chain.

function SuppliersConfig({ companyId }: { companyId: string }) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", certifications: "" });

  useEffect(() => { load(); }, [companyId]);

  async function load() {
    const { data } = await supabase.from("suppliers").select("*").eq("company_id", companyId).order("name");
    if (data) setSuppliers(data);
  }

  async function add() {
    await supabase.from("suppliers").insert({
      company_id: companyId,
      name: form.name,
      country: form.country,
      certifications: form.certifications ? form.certifications.split(",").map((s) => s.trim()) : [],
    });
    setForm({ name: "", country: "", certifications: "" });
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from("suppliers").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Suppliers</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Alerts are matched against supplier countries and certifications.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 bg-[var(--foreground)] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="border border-[var(--border)] rounded-md p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Supplier name" />
            <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} placeholder="e.g. Iceland" />
            <Field label="Certifications" value={form.certifications} onChange={(v) => setForm({ ...form, certifications: v })} placeholder="MSC, HACCP" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={!form.name || !form.country} className="bg-[var(--foreground)] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">Save</button>
            <button onClick={() => setShowForm(false)} className="text-sm text-[var(--muted-foreground)]">Cancel</button>
          </div>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-md">
        <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] grid grid-cols-4 text-xs font-medium text-[var(--muted-foreground)]">
          <span>Name</span><span>Country</span><span>Certifications</span><span></span>
        </div>
        {suppliers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">No suppliers configured yet.</div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="px-4 py-3 border-b border-[var(--border)] last:border-b-0 grid grid-cols-4 text-sm items-center">
              <span className="font-medium">{s.name}</span>
              <span>{s.country}</span>
              <span className="text-[var(--muted-foreground)]">{(s.certifications || []).join(", ") || "—"}</span>
              <span className="text-right">
                <button onClick={() => remove(s.id)} className="text-[var(--muted-foreground)] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCTS
// ============================================================
// Full CRUD on the products table, scoped to the current company_id.
// Product species, origin, and SIMP coverage status are used by the
// analysis pipeline for regulatory rule matching.

function ProductsConfig({ companyId }: { companyId: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", species: "", scientific_name: "", origin: "", simp_covered: false, production_method: "" });

  useEffect(() => { load(); }, [companyId]);

  async function load() {
    const { data } = await supabase.from("products").select("*").eq("company_id", companyId).order("name");
    if (data) setProducts(data);
  }

  async function add() {
    await supabase.from("products").insert({
      company_id: companyId,
      name: form.name,
      species: form.species,
      scientific_name: form.scientific_name || null,
      origin: form.origin,
      simp_covered: form.simp_covered,
      production_method: form.production_method || null,
    });
    setForm({ name: "", species: "", scientific_name: "", origin: "", simp_covered: false, production_method: "" });
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Species and origins are used for regulatory matching.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 bg-[var(--foreground)] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="border border-[var(--border)] rounded-md p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Atlantic Cod Fillet" />
            <Field label="Species" value={form.species} onChange={(v) => setForm({ ...form, species: v })} placeholder="e.g. Atlantic Cod" />
            <Field label="Scientific Name" value={form.scientific_name} onChange={(v) => setForm({ ...form, scientific_name: v })} placeholder="e.g. Gadus morhua" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Origin" value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} placeholder="e.g. Iceland" />
            <Field label="Production Method" value={form.production_method} onChange={(v) => setForm({ ...form, production_method: v })} placeholder="e.g. Wild-caught" />
            <div>
              <label className="block text-sm font-medium mb-1">SIMP Covered</label>
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.simp_covered} onChange={(e) => setForm({ ...form, simp_covered: e.target.checked })} />
                <span className="text-sm">Yes</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={!form.name || !form.species || !form.origin} className="bg-[var(--foreground)] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">Save</button>
            <button onClick={() => setShowForm(false)} className="text-sm text-[var(--muted-foreground)]">Cancel</button>
          </div>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-md">
        <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] grid grid-cols-6 text-xs font-medium text-[var(--muted-foreground)]">
          <span>Name</span><span>Species</span><span>Origin</span><span>SIMP</span><span>Method</span><span></span>
        </div>
        {products.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">No products configured yet.</div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="px-4 py-3 border-b border-[var(--border)] last:border-b-0 grid grid-cols-6 text-sm items-center">
              <span className="font-medium">{p.name}</span>
              <span>{p.species}</span>
              <span>{p.origin}</span>
              <span>{p.simp_covered ? "Yes" : "No"}</span>
              <span className="text-[var(--muted-foreground)]">{p.production_method || "—"}</span>
              <span className="text-right">
                <button onClick={() => remove(p.id)} className="text-[var(--muted-foreground)] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// SOURCES (read from Supabase)
// ============================================================
// Read-only view of the global sources table. Sources are shared across all
// companies (not scoped by company_id) because they represent regulatory data
// feeds (e.g. FDA, NOAA) that are the same for everyone. Users cannot add or
// remove sources from this UI -- they are managed by the platform operators.

function SourcesConfig() {
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("sources").select("*").order("name").then(({ data }) => {
      if (data) setSources(data);
    });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Monitored Sources</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Regulatory data sources that Radar monitors on your behalf.</p>
        </div>
        <Link href="/config/ingestion" className="bg-white text-sm font-medium px-4 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
          Ingestion Monitor
        </Link>
      </div>
      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center justify-between border border-[var(--border)] rounded-md px-4 py-3">
            <div>
              <p className="text-sm font-medium">{source.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{source.source_type} &middot; {source.schedule_cron || "—"}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              source.status === "active" ? "bg-green-100 text-green-700"
              : source.status === "error" ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-600"
            }`}>
              {source.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SHARED
// ============================================================
// Reusable text input field component used across all config tabs.
// Keeps form markup consistent and reduces repetition.

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
      />
    </div>
  );
}
