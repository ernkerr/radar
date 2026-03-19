'use client';

import { Bell, CheckCircle2, Circle, ClipboardList, Package, ScanSearch, Tag, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function SeverityPill({ status }) {
  if (status === 'HIGH') {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#FEF3F2] text-[#E5484D] border border-[#FDD8D8]">
        HIGH
      </span>
    );
  }
  if (status === 'MEDIUM') {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F4F4F4] text-[#666] border border-[#E6E6E6]">
        MEDIUM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F4F4F4] text-[#999] border border-[#E6E6E6]">
      {status || 'LOW'}
    </span>
  );
}

function HorizontalConnector({ visible }) {
  return (
    <div style={{ width: 48, flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}>
      <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
        <circle cx="4" cy="10" r="3" fill="#E6E6E6" stroke="#CBCBCB" strokeWidth="1" />
        <line x1="7" y1="10" x2="39" y2="10" stroke="#E6E6E6" strokeWidth="1.5" />
        <path d="M37 7L43 10L37 13" stroke="#CBCBCB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="44" cy="10" r="3" fill="#E6E6E6" stroke="#CBCBCB" strokeWidth="1" />
      </svg>
    </div>
  );
}

// Fork connector: branches from center-left into two rows
// Total SVG height matches the two stacked rows + gap between them
// Row height ~90px (node card), gap 16px → total 196px, mid at 98
function ForkConnector({ visible }) {
  // top row center y=45, bottom row center y=151 (45 + 90 + 16 + 0 = gap logic: each row is 90px tall, 16px gap)
  const topY = 45;
  const botY = 151;
  const midY = (topY + botY) / 2;
  const h = botY + topY; // 196
  return (
    <div style={{ width: 48, flexShrink: 0, height: h, display: 'flex', alignItems: 'center',
                  opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}>
      <svg width="48" height={h} viewBox={`0 0 48 ${h}`} fill="none" style={{ display: 'block' }}>
        <circle cx="4" cy={midY} r="3" fill="#E6E6E6" stroke="#CBCBCB" strokeWidth="1" />
        <line x1="7" y1={midY} x2="20" y2={midY} stroke="#E6E6E6" strokeWidth="1.5" />
        <line x1="20" y1={topY} x2="20" y2={botY} stroke="#E6E6E6" strokeWidth="1.5" />
        <line x1="20" y1={topY} x2="39" y2={topY} stroke="#E6E6E6" strokeWidth="1.5" />
        <path d={`M37 ${topY - 3}L43 ${topY}L37 ${topY + 3}`} stroke="#CBCBCB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="44" cy={topY} r="3" fill="#E6E6E6" stroke="#CBCBCB" strokeWidth="1" />
        <line x1="20" y1={botY} x2="39" y2={botY} stroke="#E6E6E6" strokeWidth="1.5" />
        <path d={`M37 ${botY - 3}L43 ${botY}L37 ${botY + 3}`} stroke="#CBCBCB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="44" cy={botY} r="3" fill="#E6E6E6" stroke="#CBCBCB" strokeWidth="1" />
      </svg>
    </div>
  );
}

function FlowNode({ icon: Icon, label, sublabel, accentColor, visible }) {
  return (
    <div style={{ width: 160, flexShrink: 0, opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(6px)',
                  transition: 'opacity 280ms ease, transform 280ms ease' }}>
      <div style={{ border: '1px solid #E6E6E6', borderRadius: 10, backgroundColor: '#fff',
                    padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accentColor }} />
        <div style={{ marginBottom: 8, marginTop: 4 }}>
          <Icon size={18} strokeWidth={1.75} color={accentColor} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.3, marginBottom: 3 }}>{label}</p>
        {sublabel && <p style={{ fontSize: 11, color: '#999', lineHeight: 1.4 }}>{sublabel}</p>}
      </div>
    </div>
  );
}

export default function EventDetail({ eventId }) {
  const router = useRouter();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [visibleCards, setVisibleCards] = useState(0);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch(`/api/events/${eventId}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Event not found.');
        const payload = await response.json();
        if (!mounted) return;
        setDetail(payload);
        setVisibleCards(0);
        setChecked({});
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Unable to load event details.');
      }
    }
    load();
    return () => { mounted = false; };
  }, [eventId]);

  useEffect(() => {
    if (!detail) return;
    // steps: 1=trigger, 2=matched, 3=fork+entities, 4+=entity actions
    const shipmentActions = detail.actions.filter(a => a.type === 'HOLD_SHIPMENT');
    const productActions = detail.actions.filter(a => a.type === 'FLAG_LABEL' || a.type === 'CREATE_TASK' || a.type === 'NOTIFY');
    const totalSteps = 3 + Math.max(shipmentActions.length, productActions.length);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setVisibleCards(i);
      if (i >= totalSteps) clearInterval(t);
    }, 350);
    return () => clearInterval(t);
  }, [detail]);

  function toggleCheck(i) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  if (error) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        <div className="border border-[#FDD8D8] bg-[#FEF3F2] text-[#E5484D] rounded px-4 py-3 text-[14px]">
          {error}
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-8">
        <p className="text-[14px] text-[#999]">Loading event…</p>
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

      {/* Header */}
      <header className="flex justify-between items-start gap-4 pb-6 border-b border-[#E6E6E6]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#111] leading-snug">
            <a
              href="https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-seafood-list"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {detail.event.name}
            </a>
          </h1>
          <p className="text-[13px] text-[#999] mt-1">{formatDate(detail.event.receivedAt)}</p>
        </div>
        <SeverityPill status={detail.event.severity} />
      </header>

      {/* What changed */}
      <section>
        <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest mb-3">What changed</p>
        <p className="text-[14px] text-[#444] leading-relaxed">
          FDA issued a labeling update affecting Atlantic cod. Labels now require a scientific name,
          catch method, and an updated country-of-origin format.
        </p>
      </section>

      {/* Affected entities */}
      <section className="space-y-5">
        {detail.impact.shipments.length > 0 && (
          <div className="border-t border-[#E6E6E6] pt-5">
            <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest mb-3">Affected shipment</p>
            {detail.impact.shipments.map((s) => (
              <div key={s.id}>
                <p className="text-[14px] font-medium text-[#111]">
                  {s.id} · {s.originCountry} · {s.supplier}
                </p>
                {s.explanation && (
                  <p className="text-[13px] text-[#999] mt-0.5">{s.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {detail.impact.products.length > 0 && (
          <div className="border-t border-[#E6E6E6] pt-5">
            <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest mb-3">Affected product</p>
            {detail.impact.products.map((p) => (
              <div key={p.id}>
                <p className="text-[14px] font-medium text-[#111]">{p.name}</p>
                {p.missingFields?.length > 0 && (
                  <p className="text-[13px] text-[#999] mt-0.5">
                    Missing: {p.missingFields.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Automation canvas */}
      <section>
        <div style={{ backgroundColor: '#F9F9F9', border: '1px solid #E6E6E6',
                      borderRadius: 10, padding: '24px', overflowX: 'auto' }}>
          {(() => {
            const iconMap = { HOLD_SHIPMENT: Package, FLAG_LABEL: Tag, CREATE_TASK: ClipboardList, NOTIFY: Bell };
            const labelMap = { HOLD_SHIPMENT: 'Hold shipment', FLAG_LABEL: 'Flag label', CREATE_TASK: 'Create task', NOTIFY: 'Notify team' };
            const colorMap = { HOLD_SHIPMENT: '#E5484D', FLAG_LABEL: '#F76B15', CREATE_TASK: '#3E63DD', NOTIFY: '#6E56CF' };

            const shipmentActions = detail.actions.filter(a => a.type === 'HOLD_SHIPMENT');
            const productActions = detail.actions.filter(a => a.type === 'FLAG_LABEL' || a.type === 'CREATE_TASK' || a.type === 'NOTIFY');

            const shipmentEntities = detail.impact.shipments;
            const productEntities = detail.impact.products;

            const hasBranch = shipmentEntities.length > 0 && productEntities.length > 0;

            return (
              <div style={{ display: 'flex', alignItems: hasBranch ? 'stretch' : 'center', minWidth: 'fit-content' }}>

                {/* Node 1 — Trigger */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FlowNode
                    icon={Zap}
                    label={detail.event.source}
                    sublabel="Regulation update"
                    accentColor="#E5484D"
                    visible={visibleCards >= 1}
                  />
                </div>

                <HorizontalConnector visible={visibleCards >= 2} />

                {/* Node 2 — Matched */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FlowNode
                    icon={ScanSearch}
                    label="Matched"
                    sublabel={[
                      productEntities.length > 0 && `${productEntities.length} product${productEntities.length !== 1 ? 's' : ''}`,
                      shipmentEntities.length > 0 && `${shipmentEntities.length} shipment${shipmentEntities.length !== 1 ? 's' : ''}`,
                    ].filter(Boolean).join(', ') || 'Your operations'}
                    accentColor="#6E56CF"
                    visible={visibleCards >= 2}
                  />
                </div>

                {hasBranch ? (
                  <>
                    {/* Fork connector */}
                    <ForkConnector visible={visibleCards >= 3} />

                    {/* Two tracks stacked */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Top track — shipments */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {shipmentEntities.map((s) => (
                          <FlowNode
                            key={s.id}
                            icon={Package}
                            label={s.id}
                            sublabel={s.originCountry}
                            accentColor="#999"
                            visible={visibleCards >= 3}
                          />
                        ))}
                        {shipmentActions.map((action, idx) => (
                          <div key={action.id} style={{ display: 'flex', alignItems: 'center' }}>
                            <HorizontalConnector visible={visibleCards >= 4 + idx} />
                            <FlowNode
                              icon={iconMap[action.type] || Bell}
                              label={labelMap[action.type] || action.type}
                              sublabel={action.targetId}
                              accentColor={colorMap[action.type] || '#999'}
                              visible={visibleCards >= 4 + idx}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Bottom track — products */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {productEntities.map((p) => (
                          <FlowNode
                            key={p.id}
                            icon={Tag}
                            label={p.name}
                            sublabel={p.species}
                            accentColor="#999"
                            visible={visibleCards >= 3}
                          />
                        ))}
                        {productActions.map((action, idx) => (
                          <div key={action.id} style={{ display: 'flex', alignItems: 'center' }}>
                            <HorizontalConnector visible={visibleCards >= 4 + idx} />
                            <FlowNode
                              icon={iconMap[action.type] || Bell}
                              label={labelMap[action.type] || action.type}
                              sublabel={action.targetId}
                              accentColor={colorMap[action.type] || '#999'}
                              visible={visibleCards >= 4 + idx}
                            />
                          </div>
                        ))}
                      </div>

                    </div>
                  </>
                ) : (
                  /* Single track fallback (no branch) */
                  detail.actions.map((action, idx) => (
                    <div key={action.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <HorizontalConnector visible={visibleCards >= 3 + idx} />
                      <FlowNode
                        icon={iconMap[action.type] || Bell}
                        label={labelMap[action.type] || action.type}
                        sublabel={action.targetId}
                        accentColor={colorMap[action.type] || '#999'}
                        visible={visibleCards >= 3 + idx}
                      />
                    </div>
                  ))
                )}

              </div>
            );
          })()}
        </div>
      </section>

      {/* Remediation checklist */}
      {detail.impact.requirements?.length > 0 && (
        <section className="border-t border-[#E6E6E6] pt-6">
          <p className="text-[12px] font-medium text-[#888] uppercase tracking-widest mb-4">
            What needs to happen
          </p>
          <div className="space-y-3">
            {detail.impact.requirements.map((req, i) => {
              const done = !!checked[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleCheck(i)}
                  className="flex items-start gap-3 w-full text-left group"
                >
                  {done ? (
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 mt-0.5 text-[#2E7D32] transition-colors duration-200 animate-check-in"
                    />
                  ) : (
                    <Circle
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 mt-0.5 text-[#E5484D] transition-colors duration-200"
                    />
                  )}
                  <span
                    className={[
                      'text-[14px] leading-snug transition-colors duration-200',
                      done
                        ? 'text-[#2E7D32] line-through decoration-[#2E7D32]/40'
                        : 'text-[#E5484D]'
                    ].join(' ')}
                  >
                    {req}
                  </span>
                </button>
              );
            })}
          </div>
          {Object.values(checked).every(Boolean) && Object.keys(checked).length === detail.impact.requirements.length && (
            <p className="mt-4 text-[13px] text-[#2E7D32] font-medium">
              All requirements addressed — ready for clearance.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
