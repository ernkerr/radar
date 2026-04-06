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
import { Building2, Truck, Fish, Globe, Plus, Trash2, X } from "lucide-react";

// Predefined options for structured inputs — prevents typos and inconsistencies.
// These are used as suggestions but users can still type custom values.
const REGION_OPTIONS = [
  "United States", "Canada", "Iceland", "Norway", "United Kingdom",
  "European Union", "Japan", "China", "Thailand", "Vietnam",
  "India", "Chile", "Ecuador", "Indonesia", "Mexico",
];

const ROLE_OPTIONS = [
  "Producer", "Importer", "Exporter", "Distributor", "Processor",
  "Wholesaler", "Retailer", "Broker",
];

// Species database — maps common names to scientific names and SIMP coverage.
// SIMP-covered species are defined by NOAA under the Seafood Import Monitoring
// Program. If a species is SIMP-covered, importers must provide additional
// traceability data (harvest info, chain of custody) at entry.
// Species database — the `common` field includes well-known alternative names
// in parentheses so users can find species by whatever name they're familiar
// with. Typing "mahi" matches "Dolphinfish (Mahi-Mahi)", typing "prawns"
// matches "Shrimp (Prawns)", etc. The full `common` string is what gets saved
// and what the relevance engine matches against regulatory documents.
const SPECIES_DB: { common: string; scientific: string; simp: boolean }[] = [
  // SIMP-covered species (per NOAA final rule)
  { common: "Abalone", scientific: "Haliotis spp.", simp: true },
  { common: "Atlantic Cod (Codfish)", scientific: "Gadus morhua", simp: true },
  { common: "Pacific Cod", scientific: "Gadus macrocephalus", simp: true },
  { common: "Blue Crab", scientific: "Callinectes sapidus", simp: true },
  { common: "King Crab (Alaskan King Crab)", scientific: "Paralithodes spp.", simp: true },
  { common: "Dolphinfish (Mahi-Mahi)", scientific: "Coryphaena hippurus", simp: true },
  { common: "Grouper", scientific: "Epinephelinae spp.", simp: true },
  { common: "Red Snapper", scientific: "Lutjanus campechanus", simp: true },
  { common: "Sea Cucumber", scientific: "Holothuroidea spp.", simp: true },
  { common: "Sharks", scientific: "Selachimorpha spp.", simp: true },
  { common: "Shrimp (Prawns)", scientific: "Penaeidae spp.", simp: true },
  { common: "Swordfish (Broadbill)", scientific: "Xiphias gladius", simp: true },
  { common: "Albacore Tuna", scientific: "Thunnus alalunga", simp: true },
  { common: "Bigeye Tuna", scientific: "Thunnus obesus", simp: true },
  { common: "Bluefin Tuna", scientific: "Thunnus thynnus", simp: true },
  { common: "Skipjack Tuna", scientific: "Katsuwonus pelamis", simp: true },
  { common: "Yellowfin Tuna (Ahi)", scientific: "Thunnus albacares", simp: true },
  // Common non-SIMP species
  { common: "Atlantic Salmon", scientific: "Salmo salar", simp: false },
  { common: "Arctic Charr (Char)", scientific: "Salvelinus alpinus", simp: false },
  { common: "Haddock", scientific: "Melanogrammus aeglefinus", simp: false },
  { common: "Halibut", scientific: "Hippoglossus hippoglossus", simp: false },
  { common: "Branzino (European Sea Bass)", scientific: "Dicentrarchus labrax", simp: false },
  { common: "Daurade (Dorade, Gilt-Head Bream)", scientific: "Sparus aurata", simp: false },
  { common: "Dover Sole", scientific: "Solea solea", simp: false },
  { common: "Saithe (Coalfish, Coley)", scientific: "Pollachius virens", simp: false },
  { common: "Wolffish (Ocean Catfish)", scientific: "Anarhichas lupus", simp: false },
  { common: "Oysters", scientific: "Crassostrea spp.", simp: false },
  { common: "Mussels", scientific: "Mytilus spp.", simp: false },
  { common: "Scallops", scientific: "Pecten spp.", simp: false },
  { common: "Clams (Quahog)", scientific: "Mercenaria mercenaria", simp: false },
  { common: "Squid", scientific: "Loligo spp.", simp: false },
  { common: "Octopus", scientific: "Octopus vulgaris", simp: false },
  { common: "Lobster (Maine Lobster)", scientific: "Homarus americanus", simp: false },
  { common: "Tilapia", scientific: "Oreochromis spp.", simp: false },
  { common: "Catfish", scientific: "Ictalurus punctatus", simp: false },
  { common: "Pollock (Alaska Pollock)", scientific: "Pollachius pollachius", simp: false },
  { common: "Sardines (Pilchard)", scientific: "Sardina pilchardus", simp: false },
  { common: "Anchovies", scientific: "Engraulis encrasicolus", simp: false },
  { common: "Mackerel", scientific: "Scomber scombrus", simp: false },
  { common: "Herring", scientific: "Clupea harengus", simp: false },
  { common: "Trout (Rainbow Trout, Steelhead)", scientific: "Oncorhynchus mykiss", simp: false },
];

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
  const [headquarters, setHeadquarters] = useState("");
  // Regions and roles are stored as arrays for consistency — no comma-parsing needed.
  const [regions, setRegions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
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
          const s = (data.settings_json as Record<string, any>) || {};
          setHeadquarters(s.headquarters || "");
          // Handle both old format (comma string) and new format (array)
          setRegions(Array.isArray(s.operating_regions) ? s.operating_regions : (s.operating_regions || "").split(",").map((r: string) => r.trim()).filter(Boolean));
          setRoles(Array.isArray(s.roles) ? s.roles : (s.roles || "").split(",").map((r: string) => r.trim()).filter(Boolean));
        }
      });
  }, [companyId]);

  async function save() {
    setSaving(true);
    await supabase
      .from("companies")
      .update({
        name,
        settings_json: { headquarters, operating_regions: regions, roles },
      })
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
        <CityAutocomplete label="Headquarters" value={headquarters} onChange={setHeadquarters} placeholder="Start typing a city..." />
        <TagSelector label="Operating Regions" selected={regions} onChange={setRegions} options={REGION_OPTIONS} placeholder="Add a region..." />
        <TagSelector label="Roles" selected={roles} onChange={setRoles} options={ROLE_OPTIONS} placeholder="Add a role..." />
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
  const [form, setForm] = useState({ name: "", country: "" });

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
    });
    setForm({ name: "", country: "" });
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
          <p className="text-sm text-[var(--muted-foreground)]">Alerts are matched against supplier countries.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 bg-[var(--foreground)] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90">
          <Plus className="w-3.5 h-3.5" /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="border border-[var(--border)] rounded-md p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Supplier name" />
            <CountryAutocomplete label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} placeholder="Start typing a country..." />
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={!form.name || !form.country} className="bg-[var(--foreground)] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50">Save</button>
            <button onClick={() => setShowForm(false)} className="text-sm text-[var(--muted-foreground)]">Cancel</button>
          </div>
        </div>
      )}

      <div className="border border-[var(--border)] rounded-md">
        <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] grid grid-cols-3 text-xs font-medium text-[var(--muted-foreground)]">
          <span>Name</span><span>Country</span><span></span>
        </div>
        {suppliers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">No suppliers configured yet.</div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="px-4 py-3 border-b border-[var(--border)] last:border-b-0 grid grid-cols-3 text-sm items-center">
              <span className="font-medium">{s.name}</span>
              <span>{s.country}</span>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Atlantic Cod Fillet" />
            <SpeciesAutocomplete
              value={form.species}
              onChange={(species, scientific, simp) => setForm({
                ...form,
                species,
                scientific_name: scientific,
                simp_covered: simp,
                // Auto-fill product name if empty
                name: form.name || species,
              })}
            />
          </div>
          {/* Show auto-filled fields as read-only info */}
          {form.scientific_name && (
            <div className="flex gap-4 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-3 py-2 rounded">
              <span>Scientific name: <strong>{form.scientific_name}</strong></span>
              <span>SIMP covered: <strong className={form.simp_covered ? "text-red-600" : ""}>{form.simp_covered ? "Yes" : "No"}</strong></span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <CountryAutocomplete label="Origin" value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} placeholder="Start typing a country..." />
            <div>
              <label className="block text-sm font-medium mb-1">Production Method</label>
              <select
                value={form.production_method}
                onChange={(e) => setForm({ ...form, production_method: e.target.value })}
                className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="Wild-caught">Wild-caught</option>
                <option value="Farmed">Farmed</option>
                <option value="Aquaculture">Aquaculture</option>
              </select>
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

// ============================================================
// SPECIES AUTOCOMPLETE
// ============================================================
// Autocomplete for seafood species that auto-fills scientific name and SIMP
// coverage from the built-in SPECIES_DB. When the user selects a species,
// the callback receives all three values so the parent form can set them.

function SpeciesAutocomplete({ value, onChange }: {
  value: string;
  onChange: (species: string, scientificName: string, simpCovered: boolean) => void;
}) {
  const [input, setInput] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = input.length >= 1
    ? SPECIES_DB.filter((s) => s.common.toLowerCase().includes(input.toLowerCase()))
    : SPECIES_DB;

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Species</label>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
            // If they type something that doesn't match, clear the auto-filled fields
            const match = SPECIES_DB.find((s) => s.common.toLowerCase() === e.target.value.toLowerCase());
            if (match) {
              onChange(match.common, match.scientific, match.simp);
            } else {
              onChange(e.target.value, "", false);
            }
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Start typing a species..."
          className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--border)] rounded-md shadow-sm max-h-48 overflow-y-auto">
            {filtered.slice(0, 10).map((species) => (
              <button
                key={species.common}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(species.common);
                  onChange(species.common, species.scientific, species.simp);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--muted)] transition-colors flex items-center justify-between"
              >
                <span>{species.common}</span>
                <span className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="italic">{species.scientific}</span>
                  {species.simp && <span className="text-red-600 font-medium">SIMP</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COUNTRY AUTOCOMPLETE
// ============================================================
// Autocomplete input with a static list of countries. Filters as you type.
// Used for supplier country and product origin fields.

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Brazil", "Cambodia", "Canada", "Chile", "China",
  "Colombia", "Costa Rica", "Croatia", "Cuba", "Czech Republic", "Denmark",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Estonia",
  "Ethiopia", "Fiji", "Finland", "France", "Germany", "Ghana", "Greece",
  "Guatemala", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan",
  "Kenya", "Latvia", "Lithuania", "Madagascar", "Malaysia", "Maldives",
  "Mexico", "Morocco", "Mozambique", "Myanmar", "Netherlands", "New Zealand",
  "Nicaragua", "Nigeria", "Norway", "Oman", "Pakistan", "Panama", "Papua New Guinea",
  "Peru", "Philippines", "Poland", "Portugal", "Romania", "Russia",
  "Saudi Arabia", "Senegal", "Singapore", "South Africa", "South Korea",
  "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Tanzania",
  "Thailand", "Tunisia", "Turkey", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Venezuela", "Vietnam", "Yemen",
];

function CountryAutocomplete({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = value.length >= 1
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(value.toLowerCase()))
    : COUNTRIES;

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--border)] rounded-md shadow-sm max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((country) => (
              <button
                key={country}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(country);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--muted)] transition-colors"
              >
                {country}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CITY AUTOCOMPLETE
// ============================================================
// Uses the free Open-Meteo geocoding API to suggest cities as the user types.
// No API key needed. Returns city name + country + admin region.
// API docs: https://open-meteo.com/en/docs/geocoding-api

function CityAutocomplete({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<{ label: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  async function search(query: string) {
    onChange(query);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en`
      );
      const data = await res.json();
      const cities = (data?.results || []).map((r: any) => ({
        // Format as "City, State/Region, Country" (e.g., "Boston, Massachusetts, United States")
        label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      }));
      setSuggestions(cities);
      setShowDropdown(cities.length > 0);
    } catch {
      setSuggestions([]);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => search(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
        />
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--border)] rounded-md shadow-sm max-h-40 overflow-y-auto">
            {suggestions.map((city) => (
              <button
                key={city.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(city.label);
                  setShowDropdown(false);
                  setSuggestions([]);
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--muted)] transition-colors"
              >
                {city.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAG SELECTOR
// ============================================================
// A structured input for multi-value fields like regions and roles.
// Shows selected values as removable tags, with a dropdown of predefined
// options. Users can also type custom values. This prevents typos and
// inconsistent formatting (e.g., "united states" vs "United States").

function TagSelector({ label, selected, onChange, options, placeholder }: {
  label: string;
  selected: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter options to exclude already-selected values and match the typed input
  const filtered = options.filter(
    (opt) => !selected.includes(opt) && opt.toLowerCase().includes(input.toLowerCase())
  );

  function addValue(value: string) {
    const trimmed = value.trim();
    const newSelected = trimmed && !selected.includes(trimmed) ? [...selected, trimmed] : selected;
    onChange(newSelected);
    setInput("");
    // Close dropdown if no more options remain, otherwise keep it open
    // so the user can quickly add multiple values without re-clicking.
    const remaining = options.filter((opt) => !newSelected.includes(opt));
    if (remaining.length === 0) setShowDropdown(false);
  }

  function removeValue(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter adds the typed value (even if it's not in the predefined options)
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) addValue(input);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 bg-[var(--muted)] text-sm px-2 py-0.5 rounded"
            >
              {value}
              <button onClick={() => removeValue(value)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-[var(--border)] rounded-md shadow-sm max-h-40 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt}
                onMouseDown={(e) => { e.preventDefault(); addValue(opt); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--muted)] transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
