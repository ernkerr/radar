'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

const inputClass =
  'w-full border border-[#E6E6E6] rounded px-3 py-1.5 text-[14px] text-[#111] placeholder:text-[#CBCBCB] focus:border-[#111] focus:outline-none transition-colors bg-white';

const labelClass = 'block text-[12px] font-medium text-[#888] mb-1';

const addBtnClass =
  'text-[12px] font-medium text-[#111] border border-[#E6E6E6] px-2.5 py-1 rounded hover:border-[#111] transition-colors';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export default function ConfigPanel() {
  const router = useRouter();
  const [knowledge, setKnowledge] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch('/api/knowledge', { cache: 'no-store' });
        if (!response.ok) throw new Error('Unable to load configuration.');
        const payload = await response.json();
        if (mounted) {
          setKnowledge({
            company: payload.company,
            species: payload.species,
            suppliers: payload.suppliers,
            products: payload.products,
            shipments: payload.shipments
          });
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Failed to load configuration');
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function updateRow(section, index, field, value) {
    setKnowledge((prev) => {
      const next = [...prev[section]];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [section]: next };
    });
  }

  function addRow(section) {
    const templates = {
      species: { id: nextId('SP'), name: '', simpCovered: false },
      suppliers: { id: nextId('SUP'), name: '', country: '' },
      products: {
        id: nextId('P'),
        name: '',
        speciesId: knowledge.species[0]?.id || '',
        productionMethod: '',
        label: { scientificName: '', catchMethod: '', originFormat: '' }
      },
      shipments: {
        id: nextId('S'),
        supplierId: knowledge.suppliers[0]?.id || '',
        originCountry: '',
        declaredSpecies: '',
        status: 'In transit',
        normalStatus: 'In transit',
        eta: ''
      }
    };
    setKnowledge((prev) => ({ ...prev, [section]: [...prev[section], templates[section]] }));
  }

  function updateCompanyName(value) {
    setKnowledge((prev) => ({ ...prev, company: { ...prev.company, name: value } }));
  }

  async function save() {
    if (!knowledge) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knowledge)
      });
      if (!response.ok) throw new Error('Unable to save configuration.');
      setMessage('Saved');
      setTimeout(() => setMessage(''), 1800);
    } catch (saveError) {
      setError(saveError.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!knowledge) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-8">
        <p className="text-[14px] text-[#999]">Loading configuration…</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-8 space-y-8">
      <button
        onClick={() => router.back()}
        className="text-[13px] text-[#999] hover:text-[#111] transition-colors flex items-center gap-1"
      >
        ← Operations
      </button>
      <header>
        <h1 className="text-[20px] font-semibold text-[#111]">Configuration</h1>
        <p className="text-[14px] text-[#666] mt-1">
          This is how the system understands your business.
        </p>
      </header>

      {error ? (
        <div className="border border-[#FEF3F2] bg-[#FEF3F2] text-[#E5484D] rounded px-4 py-3 text-[14px]">
          {error}
        </div>
      ) : null}

      {/* Company */}
      <section className="border-t border-[#E6E6E6] pt-6">
        <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest mb-4">Company</p>
        <Field label="Company name">
          <input
            className={inputClass}
            value={knowledge.company.name}
            onChange={(e) => updateCompanyName(e.target.value)}
          />
        </Field>
      </section>

      {/* Species */}
      <section className="border-t border-[#E6E6E6] pt-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Species</p>
          <button className={addBtnClass} onClick={() => addRow('species')}>+ Add</button>
        </div>
        <div>
          {knowledge.species.map((sp, i) => (
            <div key={sp.id} className="space-y-3 py-4 border-b border-[#E6E6E6] last:border-0 last:pb-0 first:pt-0">
              <Field label="Species name">
                <input
                  className={inputClass}
                  value={sp.name || ''}
                  onChange={(e) => updateRow('species', i, 'name', e.target.value)}
                  placeholder="e.g. Atlantic cod"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      {/* Suppliers */}
      <section className="border-t border-[#E6E6E6] pt-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Suppliers</p>
          <button className={addBtnClass} onClick={() => addRow('suppliers')}>+ Add</button>
        </div>
        <div>
          {knowledge.suppliers.map((sup, i) => (
            <div key={sup.id} className="space-y-3 py-4 border-b border-[#E6E6E6] last:border-0 last:pb-0 first:pt-0">
              <Field label="Supplier name">
                <input
                  className={inputClass}
                  value={sup.name || ''}
                  onChange={(e) => updateRow('suppliers', i, 'name', e.target.value)}
                  placeholder="e.g. Samherji"
                />
              </Field>
              <Field label="Country">
                <input
                  className={inputClass}
                  value={sup.country || ''}
                  onChange={(e) => updateRow('suppliers', i, 'country', e.target.value)}
                  placeholder="e.g. Iceland"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="border-t border-[#E6E6E6] pt-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Products</p>
          <button className={addBtnClass} onClick={() => addRow('products')}>+ Add</button>
        </div>
        <div>
          {knowledge.products.map((p, i) => (
            <div key={p.id} className="space-y-3 py-4 border-b border-[#E6E6E6] last:border-0 last:pb-0 first:pt-0">
              <Field label="Product name">
                <input
                  className={inputClass}
                  value={p.name || ''}
                  onChange={(e) => updateRow('products', i, 'name', e.target.value)}
                  placeholder="e.g. Atlantic Cod Fillet"
                />
              </Field>
              <Field label="Species">
                <select
                  className={inputClass + ' appearance-none'}
                  value={p.speciesId || ''}
                  onChange={(e) => updateRow('products', i, 'speciesId', e.target.value)}
                >
                  {knowledge.species.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Production method">
                <input
                  className={inputClass}
                  value={p.productionMethod || ''}
                  onChange={(e) => updateRow('products', i, 'productionMethod', e.target.value)}
                  placeholder="e.g. Wild-caught"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      {/* Shipment origins */}
      <section className="border-t border-[#E6E6E6] pt-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Shipment origins</p>
          <button className={addBtnClass} onClick={() => addRow('shipments')}>+ Add</button>
        </div>
        <div>
          {knowledge.shipments.map((s, i) => (
            <div key={s.id} className="space-y-3 py-4 border-b border-[#E6E6E6] last:border-0 last:pb-0 first:pt-0">
              <Field label="Shipment ID">
                <input
                  className={inputClass}
                  value={s.id || ''}
                  onChange={(e) => updateRow('shipments', i, 'id', e.target.value)}
                  placeholder="e.g. S1"
                />
              </Field>
              <Field label="Origin country">
                <input
                  className={inputClass}
                  value={s.originCountry || ''}
                  onChange={(e) => updateRow('shipments', i, 'originCountry', e.target.value)}
                  placeholder="e.g. Iceland"
                />
              </Field>
              <Field label="Declared species">
                <input
                  className={inputClass}
                  value={s.declaredSpecies || ''}
                  onChange={(e) => updateRow('shipments', i, 'declaredSpecies', e.target.value)}
                  placeholder="e.g. Atlantic cod"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-[#E6E6E6] pt-6 flex items-center gap-4">
        <button
          className="bg-[#111] text-white text-[14px] font-medium px-4 py-2 rounded hover:bg-[#333] disabled:opacity-50 disabled:cursor-progress transition-colors"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {message ? <span className="text-[14px] text-[#2E7D32] font-medium">{message}</span> : null}
      </div>
    </main>
  );
}
