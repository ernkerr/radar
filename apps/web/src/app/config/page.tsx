"use client";

import { useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/layout/AppNav";
import { Building2, Truck, Fish, Globe } from "lucide-react";

type Tab = "company" | "suppliers" | "products" | "sources";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "products", label: "Products", icon: Fish },
  { id: "sources", label: "Sources", icon: Globe },
];

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");

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
          {activeTab === "company" && <CompanyConfig />}
          {activeTab === "suppliers" && <SuppliersConfig />}
          {activeTab === "products" && <ProductsConfig />}
          {activeTab === "sources" && <SourcesConfig />}
        </div>
      </main>
    </div>
  );
}

function CompanyConfig() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Company Information</h2>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Configure your company details. This context is used to determine which regulatory changes are relevant to you.
      </p>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium mb-1">Company Name</label>
          <input type="text" className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm" placeholder="e.g. Aquanor Ice Fresh" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Headquarters</label>
          <input type="text" className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm" placeholder="e.g. Boston, MA" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Operating Regions</label>
          <input type="text" className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm" placeholder="e.g. United States, Iceland, Canada" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Roles</label>
          <input type="text" className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm" placeholder="e.g. Producer, Importer, Distributor" />
        </div>
        <button className="bg-[var(--accent)] text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SuppliersConfig() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Suppliers</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Manage your supplier directory. Alerts are matched against supplier countries and certifications.</p>
        </div>
        <button className="bg-[var(--accent)] text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
          Add Supplier
        </button>
      </div>
      <div className="border border-[var(--border)] rounded-md">
        <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] grid grid-cols-4 text-sm font-medium text-[var(--muted-foreground)]">
          <span>Name</span>
          <span>Country</span>
          <span>Certifications</span>
          <span>Status</span>
        </div>
        <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
          No suppliers configured yet.
        </div>
      </div>
    </div>
  );
}

function ProductsConfig() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Define your product catalog. Species and origins are used for regulatory matching.</p>
        </div>
        <button className="bg-[var(--accent)] text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
          Add Product
        </button>
      </div>
      <div className="border border-[var(--border)] rounded-md">
        <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] grid grid-cols-5 text-sm font-medium text-[var(--muted-foreground)]">
          <span>Name</span>
          <span>Species</span>
          <span>Origin</span>
          <span>SIMP</span>
          <span>Method</span>
        </div>
        <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
          No products configured yet.
        </div>
      </div>
    </div>
  );
}

function SourcesConfig() {
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
        {[
          { name: "Federal Register", type: "API", schedule: "Every 2 hours", status: "active" },
          { name: "FDA Import Alerts", type: "Page Monitor", schedule: "Every 1 hour", status: "active" },
          { name: "NOAA SIMP", type: "Page Monitor", schedule: "Every 6 hours", status: "active" },
        ].map((source) => (
          <div key={source.name} className="flex items-center justify-between border border-[var(--border)] rounded-md px-4 py-3">
            <div>
              <p className="text-sm font-medium">{source.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{source.type} &middot; {source.schedule}</p>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
              {source.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
