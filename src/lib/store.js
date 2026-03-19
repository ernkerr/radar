const REQUIRED_ORIGIN_FORMAT = 'COUNTRY (ISO-2)';

function nowIso() {
  return new Date().toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

const BASE_SPECIES = [
  { id: 'SP_COD', name: 'Atlantic cod', scientificName: 'Gadus morhua', simpCovered: true },
  { id: 'SP_HAD', name: 'Haddock', scientificName: 'Melanogrammus aeglefinus', simpCovered: false },
  { id: 'SP_CHAR', name: 'Arctic charr', scientificName: 'Salvelinus alpinus', simpCovered: false },
  { id: 'SP_SAL', name: 'Salmon', scientificName: 'Salmo salar', simpCovered: false },
  { id: 'SP_OYS', name: 'Oysters (Wianno)', scientificName: 'Crassostrea virginica', simpCovered: false },
  { id: 'SP_BASS', name: 'Sea bass', scientificName: 'Dicentrarchus labrax', simpCovered: false }
];

const BASE_KNOWLEDGE = {
  company: {
    name: 'Aquanor Seafood Imports',
    systemName: 'Aquanor Command',
    importerOfRecord: 'Aquanor US IOR-4472',
    headquarters: 'Boston, MA',
    operatingRegions: 'US Northeast, Iceland lane, Canada lane'
  },
  suppliers: [
    { id: 'SUP1', name: 'Samherji', country: 'Iceland' },
    { id: 'SUP2', name: 'NorthSea Foods', country: 'Norway' },
    { id: 'SUP3', name: 'Wianno Oyster Co-op', country: 'United States' }
  ],
  distributors: [
    { id: 'DIST1', name: 'Harbor Cold Chain', region: 'New England' },
    { id: 'DIST2', name: 'Atlantic Restaurant Supply', region: 'Mid-Atlantic' }
  ],
  locations: [
    { id: 'LOC1', name: 'Reykjavik Processor Hub', country: 'Iceland', role: 'Processor' },
    { id: 'LOC2', name: 'Boston Port Cold Storage', country: 'United States', role: 'Importer Warehouse' }
  ],
  certifications: [
    { id: 'CERT1', standard: 'HACCP', status: 'Active' },
    { id: 'CERT2', standard: 'MSC', status: 'Active' },
    { id: 'CERT3', standard: 'IFS', status: 'Active' }
  ],
  species: BASE_SPECIES,
  products: [
    {
      id: 'P1',
      name: 'Atlantic Cod Fillet',
      speciesId: 'SP_COD',
      productionMethod: 'Wild-caught',
      label: {
        scientificName: '',
        catchMethod: '',
        originFormat: 'Iceland'
      },
      labelStatus: 'Compliant',
      statusExplanation: 'No active compliance blockers',
      relatedEventId: null
    },
    {
      id: 'P2',
      name: 'Salmon Portions',
      speciesId: 'SP_SAL',
      productionMethod: 'Farmed',
      label: {
        scientificName: 'Salmo salar',
        catchMethod: 'Aquaculture harvest',
        originFormat: REQUIRED_ORIGIN_FORMAT
      },
      labelStatus: 'Compliant',
      statusExplanation: 'No active compliance blockers',
      relatedEventId: null
    }
  ],
  supplierProducts: [
    { id: 'SPM1', supplierId: 'SUP1', productId: 'P1' },
    { id: 'SPM2', supplierId: 'SUP1', productId: 'P2' }
  ],
  shipments: [
    {
      id: 'S1',
      supplierId: 'SUP1',
      originCountry: 'Iceland',
      status: 'In transit',
      normalStatus: 'In transit',
      eta: '2026-03-26',
      statusExplanation: 'No active compliance blockers',
      relatedEventId: null
    },
    {
      id: 'S2',
      supplierId: 'SUP2',
      originCountry: 'Norway',
      declaredSpecies: 'Haddock',
      status: 'In transit',
      normalStatus: 'In transit',
      eta: '2026-03-28',
      statusExplanation: 'No active compliance blockers',
      relatedEventId: null
    }
  ],
  shipmentItems: [
    { id: 'SI1', shipmentId: 'S1', productId: 'P1', quantityKg: 2200 }
  ]
};

function createInitialState() {
  return {
    knowledge: deepClone(BASE_KNOWLEDGE),
    events: [],
    eventSpecies: [],
    eventDetails: {},
    notifications: [],
    counters: {
      event: 1,
      action: 1,
      task: 1,
      eventSpecies: 1,
      generic: 500
    }
  };
}

const state = globalThis.__aquanorStore || createInitialState();
globalThis.__aquanorStore = state;

function nextId(prefix, counterKey) {
  const nextValue = state.counters[counterKey];
  state.counters[counterKey] += 1;
  return `${prefix}${nextValue}`;
}

function findSpeciesById(speciesId) {
  return state.knowledge.species.find((item) => item.id === speciesId);
}

function findSupplierById(supplierId) {
  return state.knowledge.suppliers.find((item) => item.id === supplierId);
}

function findProductById(productId) {
  return state.knowledge.products.find((item) => item.id === productId);
}

function clearEntityFlags() {
  state.knowledge.shipments.forEach((shipment) => {
    shipment.status = shipment.normalStatus || 'In transit';
    shipment.relatedEventId = null;
    shipment.statusExplanation = 'No active compliance blockers';
  });

  state.knowledge.products.forEach((product) => {
    product.labelStatus = 'Compliant';
    product.relatedEventId = null;
    product.statusExplanation = 'No active compliance blockers';
  });
}

function validateLabelForAtlanticCod(product) {
  const missing = [];

  if (!product.label?.scientificName) {
    missing.push('scientific_name');
  }

  if (!product.label?.catchMethod) {
    missing.push('catch_method');
  }

  if (product.label?.originFormat !== REQUIRED_ORIGIN_FORMAT) {
    missing.push('origin_format_v2');
  }

  return {
    compliant: missing.length === 0,
    missing
  };
}

function evaluateImpactForEvent(event) {
  const speciesIds = state.eventSpecies
    .filter((edge) => edge.eventId === event.id)
    .map((edge) => edge.speciesId);

  const affectedProducts = state.knowledge.products.filter((product) =>
    speciesIds.includes(product.speciesId)
  );

  const affectedProductIds = affectedProducts.map((product) => product.id);

  const affectedShipments = state.knowledge.shipments.filter((shipment) => {
    return state.knowledge.shipmentItems.some(
      (item) => item.shipmentId === shipment.id && affectedProductIds.includes(item.productId)
    );
  });

  const activeShipments = affectedShipments.filter((shipment) =>
    ['In transit', 'Pending customs', 'Ready for clearance'].includes(shipment.status)
  );

  const nonCompliantProducts = affectedProducts
    .map((product) => {
      const labelResult = validateLabelForAtlanticCod(product);
      return {
        ...product,
        compliant: labelResult.compliant,
        missing: labelResult.missing
      };
    })
    .filter((product) => !product.compliant);

  let severity = 'LOW';
  let reason = 'No direct operational risk detected.';

  if (nonCompliantProducts.length > 0 && activeShipments.length > 0) {
    severity = 'HIGH';
    reason = 'Active shipment + non-compliant label';
  } else if (nonCompliantProducts.length > 0) {
    severity = 'MEDIUM';
    reason = 'Non-compliant product label detected; no active impacted shipment.';
  } else if (activeShipments.length > 0) {
    severity = 'MEDIUM';
    reason = 'Active shipment impacted, but current label data passes required checks.';
  }

  return {
    severity,
    reason,
    affectedProducts,
    affectedShipments,
    nonCompliantProducts,
    requirements: [
      'Scientific name is mandatory',
      'Catch method is mandatory',
      `Country of origin format must be ${REQUIRED_ORIGIN_FORMAT}`
    ]
  };
}

function applyAutomatedActions(event, impact) {
  const actions = [];

  if (impact.severity === 'HIGH') {
    impact.affectedShipments.forEach((shipment) => {
      const mutableShipment = state.knowledge.shipments.find((item) => item.id === shipment.id);
      if (!mutableShipment) return;

      mutableShipment.status = 'On hold';
      mutableShipment.relatedEventId = event.id;
      mutableShipment.statusExplanation = `Held by ${event.change} for impacted shipment.`;

      actions.push({
        id: nextId('A', 'action'),
        type: 'HOLD_SHIPMENT',
        targetId: shipment.id,
        title: `Shipment ${shipment.id} placed on hold`,
        detail: `Shipment ${shipment.id} from ${shipment.originCountry} is held until cod label remediation is complete.`,
        timestamp: nowIso(),
        status: 'FIRED'
      });
    });

    impact.nonCompliantProducts.forEach((product) => {
      const mutableProduct = state.knowledge.products.find((item) => item.id === product.id);
      if (!mutableProduct) return;

      mutableProduct.labelStatus = 'Needs label update';
      mutableProduct.relatedEventId = event.id;
      mutableProduct.statusExplanation = `Missing label fields: ${product.missing.join(', ')}.`;

      actions.push({
        id: nextId('A', 'action'),
        type: 'FLAG_LABEL',
        targetId: product.id,
        title: `Product ${product.id} requires relabeling`,
        detail: `Missing fields: ${product.missing.join(', ')}.`,
        timestamp: nowIso(),
        status: 'FIRED'
      });
    });

    actions.push({
      id: nextId('A', 'action'),
      type: 'CREATE_TASK',
      targetId: nextId('T', 'task'),
      title: 'Update Atlantic cod label package',
      detail: 'Compliance task opened for labeling team and QA approvals.',
      timestamp: nowIso(),
      status: 'FIRED'
    });

    actions.push({
      id: nextId('A', 'action'),
      type: 'NOTIFY',
      targetId: 'OPS_CHANNEL',
      title: 'Compliance issue detected',
      detail: 'Operations, trade compliance, and customs desk have been notified.',
      timestamp: nowIso(),
      status: 'FIRED'
    });

    return actions;
  }

  actions.push({
    id: nextId('A', 'action'),
    type: 'NOTIFY',
    targetId: 'COMPLIANCE_MONITOR',
    title: 'Regulation change monitored',
    detail: `Event recorded with ${impact.severity} severity. No shipment hold applied.`,
    timestamp: nowIso(),
    status: 'FIRED'
  });

  return actions;
}

function addEventSpeciesLink(eventId, speciesId) {
  state.eventSpecies.push({
    id: nextId('ES', 'eventSpecies'),
    eventId,
    speciesId
  });
}

function enrichEvent(event) {
  const speciesNames = state.eventSpecies
    .filter((edge) => edge.eventId === event.id)
    .map((edge) => findSpeciesById(edge.speciesId)?.name)
    .filter(Boolean);

  return {
    id: event.id,
    name: event.name,
    change: event.change,
    severity: event.severity,
    source: event.source,
    receivedAt: event.receivedAt,
    species: speciesNames
  };
}

function mapShipmentView(shipment) {
  const supplier = findSupplierById(shipment.supplierId);
  const itemSpecies = state.knowledge.shipmentItems
    .filter((item) => item.shipmentId === shipment.id)
    .map((item) => findSpeciesById(findProductById(item.productId)?.speciesId)?.name)
    .filter(Boolean);

  const species = itemSpecies.length > 0 ? itemSpecies : [shipment.declaredSpecies || 'Unknown species'];

  return {
    id: shipment.id,
    supplier: supplier?.name || 'Unknown supplier',
    originCountry: shipment.originCountry,
    eta: shipment.eta,
    species: [...new Set(species)],
    status: shipment.status,
    statusExplanation: shipment.statusExplanation,
    relatedEventId: shipment.relatedEventId
  };
}

function mapProductView(product) {
  const species = findSpeciesById(product.speciesId);
  const supplierNames = state.knowledge.supplierProducts
    .filter((edge) => edge.productId === product.id)
    .map((edge) => findSupplierById(edge.supplierId)?.name)
    .filter(Boolean);

  return {
    id: product.id,
    name: product.name,
    species: species?.name || 'Unknown species',
    productionMethod: product.productionMethod,
    suppliers: supplierNames,
    labelStatus: product.labelStatus,
    statusExplanation: product.statusExplanation,
    relatedEventId: product.relatedEventId
  };
}

export function getStateSnapshot() {
  const events = [...state.events].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

  return {
    company: state.knowledge.company,
    events: events.map(enrichEvent),
    shipments: state.knowledge.shipments.map(mapShipmentView),
    products: state.knowledge.products.map(mapProductView),
    notifications: [...state.notifications]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
  };
}

export function simulateIncomingRegulationEvent() {
  clearEntityFlags();

  const event = {
    id: nextId('E', 'event'),
    source: 'FDA',
    type: 'REGULATION_UPDATE',
    name: 'New labeling requirements for Atlantic cod',
    change: 'New labeling requirements for Atlantic cod',
    receivedAt: nowIso(),
    severity: 'LOW'
  };

  state.events.unshift(event);
  addEventSpeciesLink(event.id, 'SP_COD');

  const impact = evaluateImpactForEvent(event);
  event.severity = impact.severity;

  const actions = applyAutomatedActions(event, impact);

  state.eventDetails[event.id] = {
    eventId: event.id,
    impact,
    actions
  };

  const notification = {
    id: nextId('N', 'generic'),
    timestamp: nowIso(),
    eventId: event.id,
    title: `${event.source} update detected`,
    message: `${event.name} mapped to your active supply chain.`
  };

  state.notifications.unshift(notification);

  return {
    event: enrichEvent(event),
    impact: {
      severity: impact.severity,
      reason: impact.reason,
      affectedShipmentIds: impact.affectedShipments.map((item) => item.id),
      affectedProductIds: impact.affectedProducts.map((item) => item.id)
    },
    actions
  };
}

function mapImpactShipments(impact) {
  return impact.affectedShipments.map((shipment) => {
    const supplier = findSupplierById(shipment.supplierId);
    const items = state.knowledge.shipmentItems.filter((item) => item.shipmentId === shipment.id);
    const productNames = items.map((item) => findProductById(item.productId)?.name).filter(Boolean);

    return {
      id: shipment.id,
      supplier: supplier?.name || 'Unknown supplier',
      originCountry: shipment.originCountry,
      status: shipment.status,
      products: productNames,
      explanation: shipment.statusExplanation
    };
  });
}

function mapImpactProducts(impact) {
  return impact.affectedProducts.map((product) => {
    const species = findSpeciesById(product.speciesId);
    const nonCompliant = impact.nonCompliantProducts.find((item) => item.id === product.id);

    return {
      id: product.id,
      name: product.name,
      species: species?.name || 'Unknown species',
      labelStatus: product.labelStatus,
      missingFields: nonCompliant?.missing || [],
      explanation: product.statusExplanation
    };
  });
}

export function getEventDetail(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  const detail = state.eventDetails[eventId];

  if (!event || !detail) {
    return null;
  }

  const actionNodes = detail.actions.map((action) => ({
    id: action.id,
    label: action.type,
    title: action.title,
    firedAt: action.timestamp
  }));

  return {
    event: enrichEvent(event),
    impact: {
      severity: detail.impact.severity,
      reason: detail.impact.reason,
      requirements: detail.impact.requirements,
      shipments: mapImpactShipments(detail.impact),
      products: mapImpactProducts(detail.impact)
    },
    actions: detail.actions,
    flow: {
      coreNodes: [
        { id: 'trigger', label: 'Event detected' },
        { id: 'mapping', label: 'Matched to Atlantic cod' },
        { id: 'analysis', label: 'Found in active shipment' },
        { id: 'decision', label: 'Actions triggered' }
      ],
      actionNodes
    }
  };
}

function normalizeArrayRows(rows, prefix) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row, index) => {
      const nextRow = { ...row };
      if (!nextRow.id || String(nextRow.id).trim() === '') {
        nextRow.id = `${prefix}${state.counters.generic + index}`;
      }
      return nextRow;
    })
    .filter((row) => row.id);
}

export function getKnowledge() {
  return {
    ...deepClone(state.knowledge),
    relationshipModel: [
      { label: 'Supplier ↔ Product', cardinality: 'many-to-many', via: 'supplierProducts' },
      { label: 'Shipment ↔ Product', cardinality: 'many-to-many', via: 'shipmentItems' },
      { label: 'Product → Species', cardinality: 'many-to-one', via: 'products.speciesId' },
      { label: 'Shipment → Supplier', cardinality: 'many-to-one', via: 'shipments.supplierId' },
      { label: 'Event ↔ Species', cardinality: 'many-to-many', via: 'eventSpecies' }
    ],
    requiredOriginFormat: REQUIRED_ORIGIN_FORMAT
  };
}

export function updateKnowledge(nextKnowledge) {
  const current = state.knowledge;

  const nextSpecies = normalizeArrayRows(nextKnowledge.species ?? current.species, 'SP');
  const nextSuppliers = normalizeArrayRows(nextKnowledge.suppliers ?? current.suppliers, 'SUP');
  const nextProducts = normalizeArrayRows(nextKnowledge.products ?? current.products, 'P');
  const nextShipments = normalizeArrayRows(nextKnowledge.shipments ?? current.shipments, 'S');

  state.knowledge = {
    ...current,
    company: {
      ...current.company,
      ...(nextKnowledge.company || {})
    },
    suppliers: nextSuppliers,
    distributors: normalizeArrayRows(nextKnowledge.distributors ?? current.distributors, 'DIST'),
    locations: normalizeArrayRows(nextKnowledge.locations ?? current.locations, 'LOC'),
    certifications: normalizeArrayRows(nextKnowledge.certifications ?? current.certifications, 'CERT'),
    species: nextSpecies,
    products: nextProducts.map((product) => ({
      ...product,
      label: {
        scientificName: product.label?.scientificName || '',
        catchMethod: product.label?.catchMethod || '',
        originFormat: product.label?.originFormat || ''
      },
      labelStatus: 'Compliant',
      statusExplanation: 'No active compliance blockers',
      relatedEventId: null
    })),
    supplierProducts: normalizeArrayRows(nextKnowledge.supplierProducts ?? current.supplierProducts, 'SPM'),
    shipments: nextShipments.map((shipment) => ({
      ...shipment,
      normalStatus: shipment.normalStatus || shipment.status || 'In transit',
      status: shipment.status || 'In transit',
      statusExplanation: 'No active compliance blockers',
      relatedEventId: null
    })),
    shipmentItems: normalizeArrayRows(nextKnowledge.shipmentItems ?? current.shipmentItems, 'SI')
  };

  clearEntityFlags();
  return getKnowledge();
}
