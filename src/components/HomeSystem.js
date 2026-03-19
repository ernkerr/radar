'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function sleep(ms, timersRef) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timersRef.current.push(timer);
  });
}

function SeverityPill({ status }) {
  if (status === 'HIGH') {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3F2] text-[#E5484D] border border-[#FDD8D8]">
        HIGH
      </span>
    );
  }
  if (status === 'MEDIUM') {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F4F4] text-[#666] border border-[#E6E6E6]">
        MEDIUM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F4F4] text-[#999] border border-[#E6E6E6]">
      {status || 'LOW'}
    </span>
  );
}

function StatusPill({ status }) {
  const isIssue = status === 'On hold' || status === 'Needs label update' || status === 'Detained' || status === 'Rejected';
  const isGood = status === 'In transit' || status === 'Compliant' || status === 'Cleared';

  if (isIssue) {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3F2] text-[#E5484D] border border-[#FDD8D8] whitespace-nowrap">
        {status}
      </span>
    );
  }
  if (isGood) {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#2E7D32] border border-[#BBF7D0] whitespace-nowrap">
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F4F4] text-[#666] border border-[#E6E6E6] whitespace-nowrap">
      {status}
    </span>
  );
}

export default function HomeSystem() {
  const router = useRouter();
  const [opsState, setOpsState] = useState(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [newEventId, setNewEventId] = useState('');
  const [recentlyChanged, setRecentlyChanged] = useState({ shipments: [], products: [] });
  const timersRef = useRef([]);

  async function loadState() {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load operations state.');
    const payload = await response.json();
    setOpsState(payload);
  }

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      try {
        await loadState();
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Unable to initialize');
      }
    }
    initialize();
    return () => {
      mounted = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  async function runSimulation() {
    if (running || !opsState) return;
    setRunning(true);
    setError('');
    setNewEventId('');
    setRecentlyChanged({ shipments: [], products: [] });

    try {
      await sleep(1800, timersRef);

      const response = await fetch('/api/simulate?trigger=1', { cache: 'no-store' });
      if (!response.ok) throw new Error('Simulation could not be completed.');
      const result = await response.json();

      setOpsState((prev) => ({
        ...prev,
        events: [result.event, ...prev.events]
      }));
      setNewEventId(result.event.id);

      await sleep(900, timersRef);

      setOpsState((prev) => ({
        ...prev,
        shipments: prev.shipments.map((s) => {
          if (!result.impact.affectedShipmentIds.includes(s.id)) return s;
          return {
            ...s,
            status: 'On hold',
            relatedEventId: result.event.id,
            statusExplanation: 'Held automatically after FDA labeling update for Atlantic cod.'
          };
        })
      }));
      setRecentlyChanged((prev) => ({ ...prev, shipments: result.impact.affectedShipmentIds }));

      await sleep(900, timersRef);

      setOpsState((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          if (!result.impact.affectedProductIds.includes(p.id)) return p;
          return {
            ...p,
            labelStatus: 'Needs label update',
            relatedEventId: result.event.id,
            statusExplanation: 'Missing scientific name, catch method, and updated origin format.'
          };
        })
      }));
      setRecentlyChanged((prev) => ({ ...prev, products: result.impact.affectedProductIds }));
    } catch (runError) {
      setError(runError.message || 'Simulation failed');
    } finally {
      setRunning(false);
    }
  }

  if (!opsState) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-[14px] text-[#999]">Bringing Aquanor Command online…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <p className="text-[12px] text-[#999] uppercase tracking-widest mb-1">
          {opsState.company.name}
        </p>
        <h1 className="text-[20px] font-semibold text-[#111] leading-none">
          {opsState.company.systemName}
        </h1>
        <p className="flex items-center gap-2 mt-2 text-[13px] text-[#999]">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot inline-block" />
          monitoring
        </p>
      </header>

      {error ? (
        <div className="mb-6 border border-[#FDD8D8] bg-[#FEF3F2] text-[#E5484D] rounded px-4 py-3 text-[14px]">
          {error}
        </div>
      ) : null}

      {/* Body */}
      <div className="grid gap-12" style={{ gridTemplateColumns: '1.65fr 1fr' }}>

        {/* Left — events */}
        <section>
          <div className="flex justify-end items-center mb-5">
            <button
              className="text-[12px] font-medium text-[#111] border border-[#E6E6E6] px-3 py-1.5 rounded hover:border-[#111] disabled:opacity-40 disabled:cursor-progress transition-colors"
              onClick={runSimulation}
              disabled={running}
            >
              {running ? 'Processing…' : 'Simulate regulatory change'}
            </button>
          </div>

          {opsState.events.length === 0 ? (
            <p className="text-[14px] text-[#999]">No events yet. Run a simulation.</p>
          ) : null}

          {opsState.events.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className={[
                'flex items-start gap-4 border-b border-[#E6E6E6] py-3 hover:bg-[#F4F4F4] transition-colors',
                ev.id === newEventId ? 'animate-event-in' : ''
              ].filter(Boolean).join(' ')}
            >
              <span className="text-[12px] text-[#999] shrink-0 w-11 pt-0.5">
                {formatDate(ev.receivedAt)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-[#111] leading-snug">{ev.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <SeverityPill status={ev.severity} />
                  {ev.species?.length > 0 && (
                    <span className="text-[12px] text-[#999]">{ev.species.join(', ')}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Right — shipments + products */}
        <aside>
          {/* Shipments */}
          <div className="mb-8">
            <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest mb-3">Shipments</p>
            {opsState.shipments.map((shipment) => (
              <div
                key={shipment.id}
                className={[
                  'relative group',
                  recentlyChanged.shipments.includes(shipment.id) ? 'animate-state-flash' : ''
                ].filter(Boolean).join(' ')}
              >
                <div
                  className={[
                    'flex justify-between items-center py-3 border-b border-[#E6E6E6]',
                    shipment.relatedEventId ? 'cursor-pointer hover:bg-[#F4F4F4] transition-colors' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => shipment.relatedEventId && router.push(`/events/${shipment.relatedEventId}`)}
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#111]">
                      {shipment.species.join(', ')}
                    </p>
                    <p className="text-[12px] text-[#999] mt-0.5">
                      {shipment.originCountry} · {shipment.supplier}
                    </p>
                  </div>
                  <StatusPill status={shipment.status} />
                </div>
                {shipment.relatedEventId && shipment.statusExplanation ? (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-[#111] text-white text-[12px] px-3 py-2 rounded w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none leading-relaxed">
                    {shipment.statusExplanation}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Products */}
          <div>
            <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest mb-3">Products</p>
            {opsState.products.map((product) => (
              <div
                key={product.id}
                className={[
                  'relative group',
                  recentlyChanged.products.includes(product.id) ? 'animate-state-flash' : ''
                ].filter(Boolean).join(' ')}
              >
                <div
                  className={[
                    'flex justify-between items-center py-3 border-b border-[#E6E6E6]',
                    product.relatedEventId ? 'cursor-pointer hover:bg-[#F4F4F4] transition-colors' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => product.relatedEventId && router.push(`/events/${product.relatedEventId}`)}
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#111]">{product.name}</p>
                    <p className="text-[12px] text-[#999] mt-0.5">{product.species}</p>
                  </div>
                  <StatusPill status={product.labelStatus} />
                </div>
                {product.relatedEventId && product.statusExplanation ? (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-[#111] text-white text-[12px] px-3 py-2 rounded w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none leading-relaxed">
                    {product.statusExplanation}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
