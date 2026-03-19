'use client';

import { useEffect, useState } from 'react';

function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export default function KnowledgeStudio() {
  const [knowledge, setKnowledge] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch('/api/knowledge', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Unable to load configuration.');
        }
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
        if (mounted) {
          setError(loadError.message || 'Failed to load configuration');
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  function updateRow(section, index, field, value) {
    setKnowledge((prev) => {
      const nextSection = [...prev[section]];
      nextSection[index] = {
        ...nextSection[index],
        [field]: value
      };
      return {
        ...prev,
        [section]: nextSection
      };
    });
  }

  function addRow(section) {
    const templates = {
      species: { id: nextId('SP'), name: '', scientificName: '', simpCovered: false },
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

    setKnowledge((prev) => ({
      ...prev,
      [section]: [...prev[section], templates[section]]
    }));
  }

  function updateCompanyName(value) {
    setKnowledge((prev) => ({
      ...prev,
      company: {
        ...prev.company,
        name: value
      }
    }));
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

      if (!response.ok) {
        throw new Error('Unable to save configuration.');
      }

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
      <main className="config-root">
        <p className="muted-copy">Loading configuration...</p>
      </main>
    );
  }

  return (
    <main className="config-root">
      <header>
        <h2>Configuration</h2>
        <p>This is how the system understands your business.</p>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="config-line">
        <label>
          Company name
          <input value={knowledge.company.name} onChange={(event) => updateCompanyName(event.target.value)} />
        </label>
      </section>

      <section className="config-line">
        <div className="inline-head">
          <h3>Species</h3>
          <button className="tiny-button" onClick={() => addRow('species')}>Add</button>
        </div>
        {knowledge.species.map((species, index) => (
          <div key={species.id} className="config-row">
            <input
              value={species.name || ''}
              onChange={(event) => updateRow('species', index, 'name', event.target.value)}
              placeholder="Species name"
            />
            <input
              value={species.scientificName || ''}
              onChange={(event) => updateRow('species', index, 'scientificName', event.target.value)}
              placeholder="Scientific name"
            />
          </div>
        ))}
      </section>

      <section className="config-line">
        <div className="inline-head">
          <h3>Suppliers</h3>
          <button className="tiny-button" onClick={() => addRow('suppliers')}>Add</button>
        </div>
        {knowledge.suppliers.map((supplier, index) => (
          <div key={supplier.id} className="config-row">
            <input
              value={supplier.name || ''}
              onChange={(event) => updateRow('suppliers', index, 'name', event.target.value)}
              placeholder="Supplier"
            />
            <input
              value={supplier.country || ''}
              onChange={(event) => updateRow('suppliers', index, 'country', event.target.value)}
              placeholder="Country"
            />
          </div>
        ))}
      </section>

      <section className="config-line">
        <div className="inline-head">
          <h3>Products</h3>
          <button className="tiny-button" onClick={() => addRow('products')}>Add</button>
        </div>
        {knowledge.products.map((product, index) => (
          <div key={product.id} className="config-row three-col">
            <input
              value={product.name || ''}
              onChange={(event) => updateRow('products', index, 'name', event.target.value)}
              placeholder="Product"
            />
            <select
              value={product.speciesId || ''}
              onChange={(event) => updateRow('products', index, 'speciesId', event.target.value)}
            >
              {knowledge.species.map((species) => (
                <option key={species.id} value={species.id}>
                  {species.name}
                </option>
              ))}
            </select>
            <input
              value={product.productionMethod || ''}
              onChange={(event) => updateRow('products', index, 'productionMethod', event.target.value)}
              placeholder="Production method"
            />
          </div>
        ))}
      </section>

      <section className="config-line">
        <div className="inline-head">
          <h3>Shipment origins</h3>
          <button className="tiny-button" onClick={() => addRow('shipments')}>Add</button>
        </div>
        {knowledge.shipments.map((shipment, index) => (
          <div key={shipment.id} className="config-row three-col">
            <input
              value={shipment.id || ''}
              onChange={(event) => updateRow('shipments', index, 'id', event.target.value)}
              placeholder="Shipment ID"
            />
            <input
              value={shipment.originCountry || ''}
              onChange={(event) => updateRow('shipments', index, 'originCountry', event.target.value)}
              placeholder="Origin"
            />
            <input
              value={shipment.declaredSpecies || ''}
              onChange={(event) => updateRow('shipments', index, 'declaredSpecies', event.target.value)}
              placeholder="Declared species"
            />
          </div>
        ))}
      </section>

      <div className="footer-actions">
        <button className="simulate-button" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save configuration'}
        </button>
        {message ? <span className="save-success">{message}</span> : null}
      </div>
    </main>
  );
}
