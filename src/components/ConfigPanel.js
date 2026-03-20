'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ChevronRight } from 'lucide-react';

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

const NAV_ITEMS = [
  { id: 'company',   label: 'Company' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'products',  label: 'Products' },
  { id: 'shipments', label: 'Shipment Origins' },
  { id: 'sources',   label: 'Sources' },
];

const FORMAT_NAMES = ['Whole', 'Fillet', 'Back Fillet', 'Portion', 'Steak', 'Loin', 'Tail', 'Tongue', 'Block', 'Mince', 'Other'];
const PROCESSING_STATES = ['Fresh', 'Frozen', 'Smoked', 'Live', 'Dried', 'Cured'];
const SPECIES_TYPES = ['finfish', 'bivalve shellfish', 'crustacean', 'cephalopod', 'other'];
const PRODUCTION_METHODS = ['Wild-caught', 'Farmed', 'Aquaculture harvest', 'Trap', 'Trawl', 'Longline', 'Other'];

const PRESENTATIONS = [
  'Whole', 'Head-on', 'Headless', 'Skin-on', 'Skinless',
  'PBO', 'PBI', 'C-trim', 'V-cut', 'Live', 'Other'
];

const COUNTRY_CODE_MAP = {
  'Iceland': 'IS', 'Norway': 'NO', 'United States': 'US', 'Germany': 'DE',
  'UK': 'GB', 'United Kingdom': 'GB', 'Spain': 'ES', 'France': 'FR',
  'Portugal': 'PT', 'Canada': 'CA', 'Poland': 'PL', 'Faroe Islands': 'FO',
};

const DEFAULT_SOURCES = [
  { name: 'FDA Import Alerts', url: 'https://www.accessdata.fda.gov/cms_ia/importalert_1.html', category: 'Enforcement' },
  { name: 'FDA Debarment Lists', url: 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/debarment-list', category: 'Enforcement' },
  { name: 'CBP Withhold Release Orders (WROs) — Forced Labor', url: 'https://www.cbp.gov/trade/forced-labor/withhold-release-orders-and-findings', category: 'Enforcement' },
  { name: 'NOAA MMPA Import Provisions — Comparability Findings', url: 'https://www.fisheries.noaa.gov/international/marine-mammal-protection/comparability-findings', category: 'Regulatory' },
  { name: 'NOAA FishWatch', url: 'https://www.fishwatch.gov', category: 'Reference' },
  { name: 'EU RASFF Portal', url: 'https://webgate.ec.europa.eu/rasff-window/screen/list', category: 'Regulatory' },
  { name: 'Seafood Watch (Monterey Bay Aquarium)', url: 'https://www.seafoodwatch.org', category: 'Reference' },
  { name: 'SIMP (Seafood Import Monitoring Program)', url: 'https://www.fisheries.noaa.gov/international/seafood-import-monitoring-program', category: 'Regulatory' },
  { name: 'FDA Seafood HACCP — 21 CFR Part 123', url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-123', category: 'Regulation' },
  { name: 'FDA FSVP — Foreign Supplier Verification', url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-foreign-supplier-verification-programs-fsvp-importers-food-humans-and-animals', category: 'Regulation' },
  { name: 'FDA Food Traceability List (Rule 204)', url: 'https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods', category: 'Regulation' },
  { name: 'USDA COOL for Fish and Shellfish', url: 'https://www.ams.usda.gov/rules-regulations/cool', category: 'Regulation' },
  { name: 'FDA Seafood Misbranding & Species Substitution', url: 'https://www.fda.gov/food/compliance-enforcement-food/seafood-fraud', category: 'Enforcement' },
  { name: 'FDA GovDelivery — Regulatory Updates', url: 'https://public.govdelivery.com/accounts/USFDA/subscriber/new', category: 'Feed' },
  { name: 'CBP CSMS (Cargo System Messaging Service)', url: 'https://csms.cbp.gov', category: 'Feed' },
  { name: 'Federal Register — FDA Notices', url: 'https://www.federalregister.gov/agencies/food-and-drug-administration', category: 'Feed' },
];

export default function ConfigPanel() {
  const router = useRouter();
  const [knowledge, setKnowledge] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('company');
  const [originQuery, setOriginQuery] = useState({});
  const [sourcesSearch, setSourcesSearch] = useState('');
  const [customSources, setCustomSources] = useState([]);
  const [newSource, setNewSource] = useState('');

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

  function deleteRow(section, index) {
    setKnowledge((prev) => {
      const next = prev[section].filter((_, i) => i !== index);
      return { ...prev, [section]: next };
    });
  }

  function addRow(section) {
    const templates = {
      suppliers: { id: nextId('SUP'), name: '', country: '' },
      products: {
        id: nextId('P'),
        commonName: '', scientificName: '', speciesGroup: '', speciesType: 'finfish',
        formats: [{ name: '', presentations: [] }],
        processingStates: ['fresh'], productionMethods: [],
        origins: [{ country: '', countryCode: '' }],
        label: { scientificName: '', catchMethod: '', originFormat: '' }
      },
      shipments: {
        id: nextId('S'),
        supplierId: knowledge.suppliers[0]?.id || '',
        originCountry: '', declaredSpecies: '',
        status: 'In transit', normalStatus: 'In transit', eta: ''
      }
    };
    setKnowledge((prev) => ({ ...prev, [section]: [...prev[section], templates[section]] }));
  }

  function updateProductArrayItem(productIndex, field, subIndex, value) {
    setKnowledge((prev) => {
      const nextProducts = [...prev.products];
      const nextProduct = { ...nextProducts[productIndex] };
      const nextArray = [...(nextProduct[field] || [])];
      nextArray[subIndex] = value;
      nextProduct[field] = nextArray;
      nextProducts[productIndex] = nextProduct;
      return { ...prev, products: nextProducts };
    });
  }

  function addProductArrayItem(productIndex, field, emptyValue) {
    setKnowledge((prev) => {
      const nextProducts = [...prev.products];
      const nextProduct = { ...nextProducts[productIndex] };
      nextProduct[field] = [...(nextProduct[field] || []), emptyValue];
      nextProducts[productIndex] = nextProduct;
      return { ...prev, products: nextProducts };
    });
  }

  function removeProductArrayItem(productIndex, field, subIndex) {
    setKnowledge((prev) => {
      const nextProducts = [...prev.products];
      const nextProduct = { ...nextProducts[productIndex] };
      nextProduct[field] = (nextProduct[field] || []).filter((_, idx) => idx !== subIndex);
      nextProducts[productIndex] = nextProduct;
      return { ...prev, products: nextProducts };
    });
  }

  function addPresentationToFormat(productIndex, formatIndex, value) {
    setKnowledge((prev) => {
      const nextProducts = [...prev.products];
      const nextProduct = { ...nextProducts[productIndex] };
      nextProduct.formats = nextProduct.formats.map((f, fi) =>
        fi === formatIndex ? { ...f, presentations: [...f.presentations, value] } : f
      );
      nextProducts[productIndex] = nextProduct;
      return { ...prev, products: nextProducts };
    });
  }

  function removePresentationFromFormat(productIndex, formatIndex, presentationIndex) {
    setKnowledge((prev) => {
      const nextProducts = [...prev.products];
      const nextProduct = { ...nextProducts[productIndex] };
      nextProduct.formats = nextProduct.formats.map((f, fi) =>
        fi === formatIndex
          ? { ...f, presentations: f.presentations.filter((_, pi) => pi !== presentationIndex) }
          : f
      );
      nextProducts[productIndex] = nextProduct;
      return { ...prev, products: nextProducts };
    });
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

  function renderSection() {
    if (activeSection === 'company') {
      return (
        <div className="space-y-5">
          <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Company</p>

          <Field label="Company name">
            <input
              className={inputClass}
              value={knowledge.company.name || ''}
              onChange={(e) => updateCompanyName(e.target.value)}
            />
          </Field>

          <Field label="Headquarters">
            <input
              className={inputClass}
              value={knowledge.company.headquarters || ''}
              onChange={(e) => setKnowledge((prev) => ({ ...prev, company: { ...prev.company, headquarters: e.target.value } }))}
              placeholder="e.g. Boston, MA"
            />
          </Field>

          <Field label="Importer of record">
            <input
              className={inputClass}
              value={knowledge.company.importerOfRecord || ''}
              onChange={(e) => setKnowledge((prev) => ({ ...prev, company: { ...prev.company, importerOfRecord: e.target.value } }))}
              placeholder="e.g. Aquanor US IOR-4472"
            />
          </Field>
        </div>
      );
    }

    if (activeSection === 'suppliers') {
      return (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Suppliers</p>
            <button className={addBtnClass} onClick={() => addRow('suppliers')}>+ Add</button>
          </div>
          <div className="space-y-2 pb-5">
            {knowledge.suppliers.map((sup, i) => (
              <div key={sup.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label="Name">
                    <input
                      className={inputClass}
                      value={sup.name || ''}
                      onChange={(e) => updateRow('suppliers', i, 'name', e.target.value)}
                      placeholder="e.g. Samherji"
                    />
                  </Field>
                </div>
                <div className="w-36">
                  <Field label="Country">
                    <input
                      className={inputClass}
                      value={sup.country || ''}
                      onChange={(e) => updateRow('suppliers', i, 'country', e.target.value)}
                      placeholder="e.g. Iceland"
                    />
                  </Field>
                </div>
                <div className="pb-0.5">
                  <button
                    type="button"
                    onClick={() => deleteRow('suppliers', i)}
                    className="shrink-0 text-[#CBCBCB] hover:text-[#E5484D] transition-colors"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === 'products') {
      return (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Products</p>
            <button className={addBtnClass} onClick={() => addRow('products')}>+ Add</button>
          </div>
          <div className="pb-5">
            {knowledge.products.map((p, i) => {

              return (
                <details key={p.id} className="group rounded-lg border border-[#E6E6E6] mb-2">
                  <summary className="flex items-center justify-between py-3 px-4 cursor-pointer list-none select-none hover:bg-[#F9F9F9] rounded-lg">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[14px] font-semibold text-[#111]">
                        {p.commonName || <span className="font-normal text-[#CBCBCB]">New product</span>}
                      </span>
                    </div>
                    <ChevronRight size={16} strokeWidth={1.75} className="ml-3 shrink-0 text-[#CBCBCB] transition-transform group-open:rotate-90" />
                  </summary>

                  <div className="divide-y divide-[#F0F0F0]">

                    {/* Identity */}
                    <div className="px-4 py-8">
                      <p className="text-[11px] font-medium text-[#CBCBCB] uppercase tracking-widest mb-3">Identity</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Common name">
                          <input className={inputClass} value={p.commonName || ''}
                            onChange={(e) => updateRow('products', i, 'commonName', e.target.value)}
                            placeholder="e.g. Arctic Charr" />
                        </Field>
                        <Field label="Scientific name">
                          <input className={inputClass} value={p.scientificName || ''}
                            onChange={(e) => updateRow('products', i, 'scientificName', e.target.value)}
                            placeholder="e.g. Salvelinus alpinus" />
                        </Field>
                        <Field label="Species group">
                          <input className={inputClass} value={p.speciesGroup || ''}
                            onChange={(e) => updateRow('products', i, 'speciesGroup', e.target.value)}
                            placeholder="e.g. Salmonidae" />
                        </Field>
                        <Field label="Type">
                          <select className={inputClass + ' appearance-none'} value={p.speciesType || 'finfish'}
                            onChange={(e) => updateRow('products', i, 'speciesType', e.target.value)}>
                            {SPECIES_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Field>
                      </div>
                    </div>

                    {/* Formats */}
                    <div className="px-4 py-8">
                      <p className="text-[11px] font-medium text-[#CBCBCB] uppercase tracking-widest mb-3">Formats</p>
                      {(p.formats || []).map((fmt, fi) => (
                        <div key={fi} className="border border-[#E6E6E6] rounded p-3 mb-2">
                          <div className="flex items-center gap-1.5">
                            <select
                              className={inputClass + ' appearance-none flex-1'}
                              value={fmt.name}
                              onChange={(e) => updateProductArrayItem(i, 'formats', fi, { ...fmt, name: e.target.value })}>
                              <option value="">Select…</option>
                              {FORMAT_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <button type="button" onClick={() => removeProductArrayItem(i, 'formats', fi)}
                              className="shrink-0 text-[#CBCBCB] hover:text-[#E5484D] transition-colors">
                              <Trash2 size={13} strokeWidth={1.75} />
                            </button>
                          </div>
                          <div className="pl-2 mt-2">
                            <p className="text-[11px] text-[#CBCBCB] mb-1">Presentations</p>
                            <div className="flex flex-wrap gap-1 items-center">
                              {fmt.presentations.map((pres, pi) => (
                                <span key={pi} className="inline-flex items-center gap-1.5 text-[14px] bg-[#F3F3F3] text-[#444] px-3 py-1 rounded">
                                  {pres}
                                  <button type="button" onClick={() => removePresentationFromFormat(i, fi, pi)}
                                    className="text-[#CBCBCB] hover:text-[#E5484D] transition-colors">
                                    <Trash2 size={10} strokeWidth={1.75} />
                                  </button>
                                </span>
                              ))}
                              <div className="relative inline-flex">
                                <span className="text-[12px] font-medium text-[#111] border border-[#E6E6E6] px-3 py-1 rounded pointer-events-none">+ Add</span>
                                <select
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                  value=""
                                  onChange={(e) => { if (e.target.value) addPresentationToFormat(i, fi, e.target.value); }}>
                                  <option value=""></option>
                                  {PRESENTATIONS.filter(pr => !fmt.presentations.includes(pr)).map(pr => (
                                    <option key={pr} value={pr}>{pr}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => addProductArrayItem(i, 'formats', { name: '', presentations: [] })}
                        className="text-[12px] text-[#888] hover:text-[#111] transition-colors">+ Add format</button>
                    </div>

                    {/* Sourcing */}
                    <div className="px-4 py-8">
                      <p className="text-[11px] font-medium text-[#CBCBCB] uppercase tracking-widest mb-3">Sourcing</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">

                        {/* Origins */}
                        <div>
                          <p className={labelClass}>Origins</p>
                          <div className="space-y-1.5">
                            {(p.origins || []).map((origin, si) => {
                              const key = `${i}-${si}`;
                              const query = originQuery[key];
                              const countryNames = Object.keys(COUNTRY_CODE_MAP);
                              const matches = query !== undefined
                                ? countryNames.filter(n => n.toLowerCase().includes(query.toLowerCase()))
                                : [];
                              return (
                                <div key={si} className="flex items-center gap-1.5">
                                  <div className="flex-1 relative">
                                    <input
                                      className={inputClass}
                                      value={query !== undefined ? query : (origin.country || '')}
                                      placeholder="e.g. Iceland"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setOriginQuery(prev => ({ ...prev, [key]: val }));
                                        updateProductArrayItem(i, 'origins', si, { ...origin, country: val, countryCode: '' });
                                      }}
                                      onFocus={() => setOriginQuery(prev => ({ ...prev, [key]: origin.country || '' }))}
                                      onBlur={() => setTimeout(() => setOriginQuery(prev => { const n = { ...prev }; delete n[key]; return n; }), 150)}
                                    />
                                    {query !== undefined && matches.length > 0 && (
                                      <ul className="absolute z-20 left-0 right-0 top-full mt-0.5 bg-white border border-[#E6E6E6] rounded shadow-sm max-h-44 overflow-y-auto">
                                        {matches.map(name => (
                                          <li key={name}
                                            className="px-3 py-1.5 text-[13px] text-[#111] hover:bg-[#F9F9F9] cursor-pointer"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              const code = COUNTRY_CODE_MAP[name] ?? '';
                                              updateProductArrayItem(i, 'origins', si, { ...origin, country: name, countryCode: code });
                                              setOriginQuery(prev => { const n = { ...prev }; delete n[key]; return n; });
                                            }}>
                                            {name}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                  <input
                                    className="w-12 border border-[#E6E6E6] rounded px-2 py-1.5 text-[14px] text-[#999] bg-[#F9F9F9] text-center focus:outline-none"
                                    readOnly
                                    value={origin.countryCode || ''}
                                    placeholder="—"
                                  />
                                  <button type="button" onClick={() => removeProductArrayItem(i, 'origins', si)}
                                    className="shrink-0 text-[#CBCBCB] hover:text-[#E5484D] transition-colors">
                                    <Trash2 size={13} strokeWidth={1.75} />
                                  </button>
                                </div>
                              );
                            })}
                            <button type="button" onClick={() => addProductArrayItem(i, 'origins', { country: '', countryCode: '' })}
                              className="text-[12px] text-[#888] hover:text-[#111] transition-colors">+ Add origin</button>
                          </div>
                        </div>

                        {/* Right column: processing states + production methods */}
                        <div className="space-y-4">
                          <div>
                            <p className={labelClass}>Processing states</p>
                            {(p.processingStates || []).map((val, si) => (
                              <div key={si} className="flex items-center gap-1.5 mb-1.5">
                                <select className={inputClass + ' appearance-none flex-1'} value={val}
                                  onChange={(e) => updateProductArrayItem(i, 'processingStates', si, e.target.value)}>
                                  {PROCESSING_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button type="button" onClick={() => removeProductArrayItem(i, 'processingStates', si)}
                                  className="shrink-0 text-[#CBCBCB] hover:text-[#E5484D] transition-colors">
                                  <Trash2 size={13} strokeWidth={1.75} />
                                </button>
                              </div>
                            ))}
                            <div className="relative inline-flex">
                              <span className="text-[12px] text-[#888] hover:text-[#111] pointer-events-none">+ Add processing state</span>
                              <select className="absolute inset-0 opacity-0 cursor-pointer w-full" value=""
                                onChange={(e) => { if (e.target.value) addProductArrayItem(i, 'processingStates', e.target.value); }}>
                                <option value=""></option>
                                {PROCESSING_STATES.filter(s => !(p.processingStates || []).includes(s)).map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <p className={labelClass}>Production methods</p>
                            {(p.productionMethods || []).map((val, si) => (
                              <div key={si} className="flex items-center gap-1.5 mb-1.5">
                                <select className={inputClass + ' appearance-none flex-1'} value={val}
                                  onChange={(e) => updateProductArrayItem(i, 'productionMethods', si, e.target.value)}>
                                  <option value="">Select…</option>
                                  {PRODUCTION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <button type="button" onClick={() => removeProductArrayItem(i, 'productionMethods', si)}
                                  className="shrink-0 text-[#CBCBCB] hover:text-[#E5484D] transition-colors">
                                  <Trash2 size={13} strokeWidth={1.75} />
                                </button>
                              </div>
                            ))}
                            <div className="relative inline-flex">
                              <span className="text-[12px] text-[#888] hover:text-[#111] pointer-events-none">+ Add production method</span>
                              <select className="absolute inset-0 opacity-0 cursor-pointer w-full" value=""
                                onChange={(e) => { if (e.target.value) addProductArrayItem(i, 'productionMethods', e.target.value); }}>
                                <option value=""></option>
                                {PRODUCTION_METHODS.filter(m => !(p.productionMethods || []).includes(m)).map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Delete */}
                    <div className="px-4 py-3">
                      <button type="button" onClick={() => deleteRow('products', i)}
                        className="flex items-center gap-1.5 border border-[#E5484D] text-[#E5484D] rounded px-3 py-1.5 text-[13px] hover:bg-[#FEF3F2] transition-colors">
                        <Trash2 size={13} strokeWidth={1.75} />
                        Delete product
                      </button>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeSection === 'shipments') {
      return (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Shipment origins</p>
            <button className={addBtnClass} onClick={() => addRow('shipments')}>+ Add</button>
          </div>
          <div className="space-y-2 pb-5">
            {knowledge.shipments.map((s, i) => (
              <div key={s.id} className="flex items-end gap-2">
                <div className="w-20">
                  <Field label="ID">
                    <input
                      className={inputClass}
                      value={s.id || ''}
                      onChange={(e) => updateRow('shipments', i, 'id', e.target.value)}
                      placeholder="e.g. S1"
                    />
                  </Field>
                </div>
                <div className="w-36">
                  <Field label="Origin country">
                    <input
                      className={inputClass}
                      value={s.originCountry || ''}
                      onChange={(e) => updateRow('shipments', i, 'originCountry', e.target.value)}
                      placeholder="e.g. Iceland"
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Declared species">
                    <input
                      className={inputClass}
                      value={s.declaredSpecies || ''}
                      onChange={(e) => updateRow('shipments', i, 'declaredSpecies', e.target.value)}
                      placeholder="e.g. Atlantic cod"
                    />
                  </Field>
                </div>
                <div className="pb-0.5">
                  <button
                    type="button"
                    onClick={() => deleteRow('shipments', i)}
                    className="shrink-0 text-[#CBCBCB] hover:text-[#E5484D] transition-colors"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeSection === 'sources') {
      const allSources = [
        ...DEFAULT_SOURCES,
        ...customSources.map(name => ({ name, url: '', category: 'Custom' }))
      ];
      const filtered = sourcesSearch.trim()
        ? allSources.filter(s => s.name.toLowerCase().includes(sourcesSearch.toLowerCase()) || s.category.toLowerCase().includes(sourcesSearch.toLowerCase()))
        : allSources;
      const categories = [...new Set(filtered.map(s => s.category))];

      return (
        <div className="space-y-4">
          <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest">Sources</p>

          <input
            className={inputClass}
            placeholder="Search sources…"
            value={sourcesSearch}
            onChange={(e) => setSourcesSearch(e.target.value)}
          />

          <div className="space-y-5 pb-2">
            {categories.map(cat => (
              <div key={cat}>
                <p className="text-[11px] font-medium text-[#CBCBCB] uppercase tracking-widest mb-2">{cat}</p>
                <ul className="space-y-1.5">
                  {filtered.filter(s => s.category === cat).map((source) => (
                    <li key={source.name} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#CBCBCB] shrink-0" />
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noopener noreferrer"
                          className="text-[13px] text-[#111] hover:underline">
                          {source.name}
                        </a>
                      ) : (
                        <span className="text-[13px] text-[#111]">{source.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-[13px] text-[#999]">No sources match.</p>
            )}
          </div>

          <div className="flex items-stretch gap-2 pt-2 border-t border-[#F0F0F0]">
            <input
              className={inputClass + ' flex-1'}
              placeholder="Add a source…"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSource.trim()) {
                  setCustomSources(prev => [...prev, newSource.trim()]);
                  setNewSource('');
                }
              }}
            />
            <button
              type="button"
              className="bg-[#111] text-white text-[14px] font-medium px-4 rounded hover:bg-[#333] transition-colors"
              onClick={() => {
                if (newSource.trim()) {
                  setCustomSources(prev => [...prev, newSource.trim()]);
                  setNewSource('');
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  if (!knowledge) {
    return (
      <main className="max-w-4xl mx-auto px-5 py-8">
        <p className="text-[14px] text-[#999]">Loading configuration…</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-5 py-8 space-y-6">
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

      <div className="grid border border-[#E6E6E6] rounded" style={{ gridTemplateColumns: '180px 1fr' }}>
        {/* Sidebar */}
        <nav className="border-r border-[#E6E6E6] py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={[
                'w-full text-left px-4 py-2.5 text-[13px] transition-colors',
                activeSection === item.id
                  ? 'font-medium text-[#111] bg-[#F9F9F9]'
                  : 'text-[#888] hover:text-[#111] hover:bg-[#F9F9F9]'
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="p-6 min-h-[420px] flex flex-col">
          {renderSection()}

          {activeSection !== 'sources' && (
            <div className="border-t border-[#E6E6E6] pt-5 mt-auto flex items-center gap-4">
              <button
                className="bg-[#111] text-white text-[14px] font-medium px-4 py-2 rounded hover:bg-[#333] disabled:opacity-50 disabled:cursor-progress transition-colors"
                onClick={save}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {message ? <span className="text-[14px] text-[#2E7D32] font-medium">{message}</span> : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
