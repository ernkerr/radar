const REQUIRED_ORIGIN_FORMAT = "COUNTRY (ISO-2)";

function nowIso() {
  return new Date().toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Species retained only as a lookup for compliance engine cross-referencing
const BASE_SPECIES = [
  {
    id: "SP_COD",
    name: "Atlantic Cod",
    scientificName: "Gadus morhua",
    simpCovered: true,
  },
  {
    id: "SP_HAD",
    name: "Haddock",
    scientificName: "Melanogrammus aeglefinus",
    simpCovered: false,
  },
  {
    id: "SP_CHAR",
    name: "Arctic Charr",
    scientificName: "Salvelinus alpinus",
    simpCovered: false,
  },
  {
    id: "SP_SAL",
    name: "Atlantic Salmon",
    scientificName: "Salmo salar",
    simpCovered: false,
  },
  {
    id: "SP_SAL_LB",
    name: "Landbased Salmon",
    scientificName: "Salmo salar",
    simpCovered: false,
  },
  {
    id: "SP_OYS",
    name: "Oysters (WiAnno)",
    scientificName: "Crassostrea virginica",
    simpCovered: false,
  },
  {
    id: "SP_BASS",
    name: "Branzino",
    scientificName: "Dicentrarchus labrax",
    simpCovered: false,
  },
  {
    id: "SP_HAL",
    name: "Halibut",
    scientificName: "Hippoglossus hippoglossus",
    simpCovered: true,
  },
  {
    id: "SP_DAU",
    name: "Daurade",
    scientificName: "Sparus aurata",
    simpCovered: false,
  },
  {
    id: "SP_SOLE",
    name: "Dover Sole",
    scientificName: "Solea solea",
    simpCovered: false,
  },
  {
    id: "SP_SAITHE",
    name: "Saithe",
    scientificName: "Pollachius virens",
    simpCovered: false,
  },
  {
    id: "SP_WOLF",
    name: "Wolffish",
    scientificName: "Anarhichas lupus",
    simpCovered: false,
  },
];

const BASE_KNOWLEDGE = {
  company: {
    name: "Aquanor Ice Fresh",
    systemName: "Aquanor Command",
    importerOfRecord: "Aquanor US IOR-4472",
    headquarters: "Boston, MA",
    operatingRegions: ["United States", "Iceland", "Canada"],
    roles: ["Producer", "Importer", "Distributor"],
  },
  suppliers: [
    { id: "SUP1", name: "Samherji", country: "Iceland" },
    { id: "SUP2", name: "NorthSea Foods", country: "Norway" },
    { id: "SUP3", name: "Wianno Oyster Co-op", country: "United States" },
  ],
  distributors: [
    { id: "DIST1", name: "Harbor Cold Chain", region: "New England" },
    { id: "DIST2", name: "Atlantic Restaurant Supply", region: "Mid-Atlantic" },
  ],
  locations: [
    {
      id: "LOC1",
      name: "Reykjavik Processor Hub",
      country: "Iceland",
      role: "Processor",
    },
    {
      id: "LOC2",
      name: "Boston Port Cold Storage",
      country: "United States",
      role: "Importer Warehouse",
    },
  ],
  certifications: [
    { id: "CERT1", standard: "HACCP", status: "Active" },
    { id: "CERT2", standard: "MSC", status: "Active" },
    { id: "CERT3", standard: "IFS", status: "Active" },
  ],
  species: BASE_SPECIES,
  products: [
    {
      id: "P1",
      commonName: "Arctic Charr",
      scientificName: "Salvelinus alpinus",
      speciesGroup: "Salmonidae",
      speciesType: "finfish",
      speciesId: "SP_CHAR",
      formats: [
        { name: "Whole", presentations: ["Head-on"] },
        { name: "Fillet", presentations: ["PBO", "Skin-on", "C-trim"] },
      ],
      processingStates: ["Fresh"],
      productionMethods: ["Farmed"],
      origins: [{ country: "Iceland", countryCode: "IS" }],
      label: {
        scientificName: "Salvelinus alpinus",
        catchMethod: "Aquaculture harvest",
        originFormat: "IS",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P2",
      commonName: "Atlantic Cod",
      scientificName: "Gadus morhua",
      speciesGroup: "Gadidae",
      speciesType: "finfish",
      speciesId: "SP_COD",
      formats: [
        { name: "Loin", presentations: [] },
        {
          name: "Fillet",
          presentations: ["Skinless / PBI", "Skin-on / PBI", "Skinless / PBO"],
        },
        { name: "Back Fillet", presentations: [] },
        { name: "Portion", presentations: [] },
        { name: "Tail", presentations: [] },
        { name: "Tongue", presentations: [] },
        { name: "Block", presentations: [] },
        { name: "Mince", presentations: [] },
      ],
      processingStates: ["Fresh", "Frozen"],
      productionMethods: ["Wild-caught"],
      origins: [
        { country: "Iceland", countryCode: "IS" },
        { country: "Barents Sea / EU Fleet", countryCode: "" },
      ],
      label: {
        scientificName: "Gadus morhua",
        catchMethod: "Trawl / Longline",
        originFormat: "IS",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P3",
      commonName: "Haddock",
      scientificName: "Melanogrammus aeglefinus",
      speciesGroup: "Gadidae",
      speciesType: "finfish",
      speciesId: "SP_HAD",
      formats: [
        { name: "Loin", presentations: [] },
        {
          name: "Fillet",
          presentations: ["Skinless / PBI", "Skin-on / PBI", "Skinless / PBO"],
        },
        { name: "Back Fillet", presentations: [] },
        { name: "Portion", presentations: [] },
        { name: "Tail", presentations: [] },
        { name: "Tongue", presentations: [] },
        { name: "Block", presentations: [] },
        { name: "Mince", presentations: [] },
      ],
      processingStates: ["Fresh", "Frozen"],
      productionMethods: ["Wild-caught"],
      origins: [
        { country: "Iceland", countryCode: "IS" },
        { country: "Barents Sea / EU Fleet", countryCode: "" },
      ],
      label: {
        scientificName: "Melanogrammus aeglefinus",
        catchMethod: "Trawl / Longline",
        originFormat: "IS",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P4",
      commonName: "WiAnno Oysters",
      scientificName: "Crassostrea virginica",
      speciesGroup: "Ostreidae",
      speciesType: "shellfish",
      speciesId: "SP_OYS",
      formats: [{ name: "Live", presentations: ['3"', '2.5-3"'] }],
      processingStates: ["Fresh"],
      productionMethods: ["Farmed"],
      origins: [{ country: "United States", countryCode: "US" }],
      label: {
        scientificName: "Crassostrea virginica",
        catchMethod: "Aquaculture harvest",
        originFormat: "US",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P5",
      commonName: "Landbased Salmon",
      scientificName: "Salmo salar",
      speciesGroup: "Salmonidae",
      speciesType: "finfish",
      speciesId: "SP_SAL_LB",
      formats: [
        { name: "Whole", presentations: [] },
        { name: "Fillet", presentations: [] },
      ],
      processingStates: ["Fresh"],
      productionMethods: ["Farmed"],
      origins: [{ country: "Iceland", countryCode: "IS" }],
      label: {
        scientificName: "Salmo salar",
        catchMethod: "Aquaculture harvest",
        originFormat: "IS",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P6",
      commonName: "Branzino",
      scientificName: "Dicentrarchus labrax",
      speciesGroup: "Moronidae",
      speciesType: "finfish",
      speciesId: "SP_BASS",
      formats: [{ name: "Whole", presentations: ["Whole Round"] }],
      processingStates: ["Fresh"],
      productionMethods: ["Farmed"],
      origins: [{ country: "Greece", countryCode: "GR" }],
      label: {
        scientificName: "Dicentrarchus labrax",
        catchMethod: "Aquaculture harvest",
        originFormat: "GR",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P7",
      commonName: "Atlantic Salmon",
      scientificName: "Salmo salar",
      speciesGroup: "Salmonidae",
      speciesType: "finfish",
      speciesId: "SP_SAL",
      formats: [
        { name: "Whole", presentations: ["Head-on", "Gutted"] },
        { name: "Fillet", presentations: ["PBO", "Skin-on", "Scaled"] },
      ],
      processingStates: ["Fresh"],
      productionMethods: ["Farmed"],
      origins: [{ country: "Norway", countryCode: "NO" }],
      label: {
        scientificName: "Salmo salar",
        catchMethod: "Aquaculture harvest",
        originFormat: "NO",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P8",
      commonName: "Halibut",
      scientificName: "Hippoglossus hippoglossus",
      speciesGroup: "Pleuronectidae",
      speciesType: "finfish",
      speciesId: "SP_HAL",
      formats: [{ name: "Whole", presentations: [] }],
      processingStates: ["Fresh"],
      productionMethods: ["Wild-caught"],
      origins: [{ country: "Norway", countryCode: "NO" }],
      label: {
        scientificName: "Hippoglossus hippoglossus",
        catchMethod: "Longline",
        originFormat: "NO",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P9",
      commonName: "Daurade",
      scientificName: "Sparus aurata",
      speciesGroup: "Sparidae",
      speciesType: "finfish",
      speciesId: "SP_DAU",
      formats: [{ name: "Whole", presentations: ["Whole Round"] }],
      processingStates: ["Fresh"],
      productionMethods: ["Farmed"],
      origins: [{ country: "Greece", countryCode: "GR" }],
      label: {
        scientificName: "Sparus aurata",
        catchMethod: "Aquaculture harvest",
        originFormat: "GR",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P10",
      commonName: "Dover Sole",
      scientificName: "Solea solea",
      speciesGroup: "Soleidae",
      speciesType: "finfish",
      speciesId: "SP_SOLE",
      formats: [{ name: "Whole", presentations: ["Head-on", "Gutted"] }],
      processingStates: ["Fresh"],
      productionMethods: ["Wild-caught"],
      origins: [{ country: "Netherlands", countryCode: "NL" }],
      label: {
        scientificName: "Solea solea",
        catchMethod: "Trawl",
        originFormat: "NL",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P11",
      commonName: "Saithe",
      scientificName: "Pollachius virens",
      speciesGroup: "Gadidae",
      speciesType: "finfish",
      speciesId: "SP_SAITHE",
      formats: [
        { name: "Loin", presentations: [] },
        {
          name: "Fillet",
          presentations: ["Skinless / PBI", "Skin-on / PBI", "Skinless / PBO"],
        },
        { name: "Back Fillet", presentations: [] },
        { name: "Loin Cut", presentations: [] },
        { name: "Tail", presentations: [] },
        { name: "Block", presentations: [] },
        { name: "Mince", presentations: [] },
      ],
      processingStates: ["Fresh", "Frozen"],
      productionMethods: ["Wild-caught"],
      origins: [
        { country: "Iceland", countryCode: "IS" },
        { country: "Barents Sea / EU Fleet", countryCode: "" },
      ],
      label: {
        scientificName: "Pollachius virens",
        catchMethod: "Trawl / Longline",
        originFormat: "IS",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "P12",
      commonName: "Wolffish",
      scientificName: "Anarhichas lupus",
      speciesGroup: "Anarhichadidae",
      speciesType: "finfish",
      speciesId: "SP_WOLF",
      formats: [
        {
          name: "Fillet",
          presentations: ["Skinless", "Boneless", "Fully trimmed"],
        },
      ],
      processingStates: ["Fresh"],
      productionMethods: ["Wild-caught"],
      origins: [{ country: "Iceland", countryCode: "IS" }],
      label: {
        scientificName: "Anarhichas lupus",
        catchMethod: "Longline",
        originFormat: "IS",
      },
      labelStatus: "Compliant",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
  ],
  supplierProducts: [
    { id: "SPM1", supplierId: "SUP1", productId: "P1" },
    { id: "SPM2", supplierId: "SUP1", productId: "P2" },
    { id: "SPM3", supplierId: "SUP1", productId: "P3" },
  ],
  shipments: [
    {
      id: "S1",
      supplierId: "SUP1",
      originCountry: "Iceland",
      status: "In transit",
      normalStatus: "In transit",
      eta: "2026-03-26",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
    {
      id: "S2",
      supplierId: "SUP2",
      originCountry: "Norway",
      declaredSpecies: "Haddock",
      status: "In transit",
      normalStatus: "In transit",
      eta: "2026-03-28",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    },
  ],
  shipmentItems: [
    { id: "SI1", shipmentId: "S1", productId: "P1", quantityKg: 2200 },
    { id: "SI2", shipmentId: "S1", productId: "P2", quantityKg: 1800 },
  ],
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
      generic: 500,
    },
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
    shipment.status = shipment.normalStatus || "In transit";
    shipment.relatedEventId = null;
    shipment.statusExplanation = "No active compliance blockers";
  });

  state.knowledge.products.forEach((product) => {
    product.labelStatus = "Compliant";
    product.relatedEventId = null;
    product.statusExplanation = "No active compliance blockers";
  });
}

function validateLabelForAtlanticCod(product) {
  const missing = [];

  if (!product.label?.scientificName) {
    missing.push("scientific_name");
  }

  if (!product.label?.catchMethod) {
    missing.push("catch_method");
  }

  if (product.label?.originFormat !== REQUIRED_ORIGIN_FORMAT) {
    missing.push("origin_format_v2");
  }

  return {
    compliant: missing.length === 0,
    missing,
  };
}

function evaluateImpactForEvent(event) {
  const speciesIds = state.eventSpecies
    .filter((edge) => edge.eventId === event.id)
    .map((edge) => edge.speciesId);

  const affectedProducts = state.knowledge.products.filter((product) =>
    speciesIds.includes(product.speciesId),
  );

  const affectedProductIds = affectedProducts.map((product) => product.id);

  const affectedShipments = state.knowledge.shipments.filter((shipment) => {
    return state.knowledge.shipmentItems.some(
      (item) =>
        item.shipmentId === shipment.id &&
        affectedProductIds.includes(item.productId),
    );
  });

  const activeShipments = affectedShipments.filter((shipment) =>
    ["In transit", "Pending customs", "Ready for clearance"].includes(
      shipment.status,
    ),
  );

  const nonCompliantProducts = affectedProducts
    .map((product) => {
      const labelResult = validateLabelForAtlanticCod(product);
      return {
        ...product,
        compliant: labelResult.compliant,
        missing: labelResult.missing,
      };
    })
    .filter((product) => !product.compliant);

  let severity = "LOW";
  let reason = "No direct operational risk detected.";

  if (nonCompliantProducts.length > 0 && activeShipments.length > 0) {
    severity = "HIGH";
    reason = "Active shipment + non-compliant label";
  } else if (nonCompliantProducts.length > 0) {
    severity = "MEDIUM";
    reason =
      "Non-compliant product label detected; no active impacted shipment.";
  } else if (activeShipments.length > 0) {
    severity = "MEDIUM";
    reason =
      "Active shipment impacted, but current label data passes required checks.";
  }

  return {
    severity,
    reason,
    affectedProducts,
    affectedShipments,
    nonCompliantProducts,
    requirements: [
      "Scientific name is mandatory",
      "Catch method is mandatory",
      `Country of origin format must be ${REQUIRED_ORIGIN_FORMAT}`,
    ],
  };
}

function applyAutomatedActions(event, impact) {
  const actions = [];

  if (impact.severity === "HIGH") {
    impact.affectedShipments.forEach((shipment) => {
      const mutableShipment = state.knowledge.shipments.find(
        (item) => item.id === shipment.id,
      );
      if (!mutableShipment) return;

      mutableShipment.status = "On hold";
      mutableShipment.relatedEventId = event.id;
      mutableShipment.statusExplanation = `Held by ${event.change} for impacted shipment.`;

      actions.push({
        id: nextId("A", "action"),
        type: "HOLD_SHIPMENT",
        targetId: shipment.id,
        title: `Shipment ${shipment.id} placed on hold`,
        detail: `Shipment ${shipment.id} from ${shipment.originCountry} is held until cod label remediation is complete.`,
        timestamp: nowIso(),
        status: "FIRED",
      });
    });

    impact.nonCompliantProducts.forEach((product) => {
      const mutableProduct = state.knowledge.products.find(
        (item) => item.id === product.id,
      );
      if (!mutableProduct) return;

      mutableProduct.labelStatus = "Needs label update";
      mutableProduct.relatedEventId = event.id;
      mutableProduct.statusExplanation = `Missing label fields: ${product.missing.join(", ")}.`;

      actions.push({
        id: nextId("A", "action"),
        type: "FLAG_LABEL",
        targetId: product.id,
        title: `Product ${product.id} requires relabeling`,
        detail: `Missing fields: ${product.missing.join(", ")}.`,
        timestamp: nowIso(),
        status: "FIRED",
      });
    });

    actions.push({
      id: nextId("A", "action"),
      type: "CREATE_TASK",
      targetId: nextId("T", "task"),
      title: "Update Atlantic cod label package",
      detail: "Compliance task opened for labeling team and QA approvals.",
      timestamp: nowIso(),
      status: "FIRED",
    });

    actions.push({
      id: nextId("A", "action"),
      type: "NOTIFY",
      targetId: "OPS_CHANNEL",
      title: "Compliance issue detected",
      detail:
        "Operations, trade compliance, and customs desk have been notified.",
      timestamp: nowIso(),
      status: "FIRED",
    });

    return actions;
  }

  actions.push({
    id: nextId("A", "action"),
    type: "NOTIFY",
    targetId: "COMPLIANCE_MONITOR",
    title: "Regulation change monitored",
    detail: `Event recorded with ${impact.severity} severity. No shipment hold applied.`,
    timestamp: nowIso(),
    status: "FIRED",
  });

  return actions;
}

function addEventSpeciesLink(eventId, speciesId) {
  state.eventSpecies.push({
    id: nextId("ES", "eventSpecies"),
    eventId,
    speciesId,
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
    species: speciesNames,
  };
}

function mapShipmentView(shipment) {
  const supplier = findSupplierById(shipment.supplierId);
  const itemSpecies = state.knowledge.shipmentItems
    .filter((item) => item.shipmentId === shipment.id)
    .map(
      (item) =>
        findSpeciesById(findProductById(item.productId)?.speciesId)?.name,
    )
    .filter(Boolean);

  const species =
    itemSpecies.length > 0
      ? itemSpecies
      : [shipment.declaredSpecies || "Unknown species"];

  return {
    id: shipment.id,
    supplier: supplier?.name || "Unknown supplier",
    originCountry: shipment.originCountry,
    eta: shipment.eta,
    species: [...new Set(species)],
    status: shipment.status,
    statusExplanation: shipment.statusExplanation,
    relatedEventId: shipment.relatedEventId,
  };
}

const COUNTRY_ADJECTIVES = {
  Iceland: "Icelandic",
  Norway: "Norwegian",
  Canada: "Canadian",
  "United States": "American",
  "United Kingdom": "British",
  UK: "British",
  Spain: "Spanish",
  France: "French",
  Portugal: "Portuguese",
  Germany: "German",
  Poland: "Polish",
  "Faroe Islands": "Faroese",
  Denmark: "Danish",
  Sweden: "Swedish",
  Finland: "Finnish",
  Russia: "Russian",
  Japan: "Japanese",
  Chile: "Chilean",
  Peru: "Peruvian",
  China: "Chinese",
  Ireland: "Irish",
  Scotland: "Scottish",
  Greenland: "Greenlandic",
};

function countryToAdjective(name) {
  return COUNTRY_ADJECTIVES[name] || name;
}

function mapProductView(product) {
  const supplierNames = state.knowledge.supplierProducts
    .filter((edge) => edge.productId === product.id)
    .map((edge) => findSupplierById(edge.supplierId)?.name)
    .filter(Boolean);

  const displayName = product.commonName || "Unknown product";

  return {
    id: product.id,
    name: displayName,
    commonName: product.commonName,
    scientificName: product.scientificName,
    speciesGroup: product.speciesGroup,
    speciesType: product.speciesType,
    formats: Array.isArray(product.formats) ? product.formats : [],
    processingStates: Array.isArray(product.processingStates)
      ? product.processingStates
      : product.processingState
        ? [product.processingState]
        : [],
    productionMethods: Array.isArray(product.productionMethods)
      ? product.productionMethods
      : product.productionMethod
        ? [product.productionMethod]
        : [],
    origins: Array.isArray(product.origins)
      ? product.origins.map((o) => ({
          ...o,
          adjective: countryToAdjective(o.country),
        }))
      : product.originCountry
        ? [
            {
              country: "",
              countryCode: product.originCountry,
              adjective: product.originCountry,
            },
          ]
        : [],
    suppliers: supplierNames,
    labelStatus: product.labelStatus,
    statusExplanation: product.statusExplanation,
    relatedEventId: product.relatedEventId,
  };
}

export function getStateSnapshot() {
  const events = [...state.events].sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt),
  );

  return {
    company: state.knowledge.company,
    events: events.map(enrichEvent),
    shipments: state.knowledge.shipments.map(mapShipmentView),
    products: state.knowledge.products.map(mapProductView),
    notifications: [...state.notifications]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5),
  };
}

export function simulateIncomingRegulationEvent() {
  clearEntityFlags();

  const event = {
    id: nextId("E", "event"),
    source: "FDA",
    type: "REGULATION_UPDATE",
    name: "New labeling requirements for Atlantic cod",
    change: "New labeling requirements for Atlantic cod",
    receivedAt: nowIso(),
    severity: "LOW",
  };

  state.events.unshift(event);
  addEventSpeciesLink(event.id, "SP_COD");

  const impact = evaluateImpactForEvent(event);
  event.severity = impact.severity;

  const actions = applyAutomatedActions(event, impact);

  state.eventDetails[event.id] = {
    eventId: event.id,
    impact,
    actions,
  };

  const notification = {
    id: nextId("N", "generic"),
    timestamp: nowIso(),
    eventId: event.id,
    title: `${event.source} update detected`,
    message: `${event.name} mapped to your active supply chain.`,
  };

  state.notifications.unshift(notification);

  return {
    event: enrichEvent(event),
    impact: {
      severity: impact.severity,
      reason: impact.reason,
      affectedShipmentIds: impact.affectedShipments.map((item) => item.id),
      affectedProductIds: impact.affectedProducts.map((item) => item.id),
    },
    actions,
  };
}

function mapImpactShipments(impact) {
  return impact.affectedShipments.map((shipment) => {
    const supplier = findSupplierById(shipment.supplierId);
    const items = state.knowledge.shipmentItems.filter(
      (item) => item.shipmentId === shipment.id,
    );
    const productNames = items
      .map((item) => findProductById(item.productId)?.commonName)
      .filter(Boolean);

    return {
      id: shipment.id,
      supplier: supplier?.name || "Unknown supplier",
      originCountry: shipment.originCountry,
      status: shipment.status,
      products: productNames,
      explanation: shipment.statusExplanation,
    };
  });
}

function mapImpactProducts(impact) {
  return impact.affectedProducts.map((product) => {
    const species = findSpeciesById(product.speciesId);
    const nonCompliant = impact.nonCompliantProducts.find(
      (item) => item.id === product.id,
    );

    const formatNames = Array.isArray(product.formats)
      ? product.formats.map((f) => f.name)
      : [];
    const formatLabel =
      formatNames.length > 2
        ? formatNames.slice(0, 2).join(" / ") + ` +${formatNames.length - 2}`
        : formatNames.join(" / ");
    const displayName =
      [product.commonName, formatLabel].filter(Boolean).join(" — ") ||
      product.commonName ||
      "Unknown product";
    return {
      id: product.id,
      name: displayName,
      species: product.commonName || species?.name || "Unknown species",
      labelStatus: product.labelStatus,
      missingFields: nonCompliant?.missing || [],
      explanation: product.statusExplanation,
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
    firedAt: action.timestamp,
  }));

  return {
    event: enrichEvent(event),
    impact: {
      severity: detail.impact.severity,
      reason: detail.impact.reason,
      requirements: detail.impact.requirements,
      shipments: mapImpactShipments(detail.impact),
      products: mapImpactProducts(detail.impact),
    },
    actions: detail.actions,
    flow: {
      coreNodes: [
        { id: "trigger", label: "Event detected" },
        { id: "mapping", label: "Matched to Atlantic cod" },
        { id: "analysis", label: "Found in active shipment" },
        { id: "decision", label: "Actions triggered" },
      ],
      actionNodes,
    },
  };
}

function normalizeArrayRows(rows, prefix) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row, index) => {
      const nextRow = { ...row };
      if (!nextRow.id || String(nextRow.id).trim() === "") {
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
      {
        label: "Supplier ↔ Product",
        cardinality: "many-to-many",
        via: "supplierProducts",
      },
      {
        label: "Shipment ↔ Product",
        cardinality: "many-to-many",
        via: "shipmentItems",
      },
      {
        label: "Product → Species",
        cardinality: "many-to-one",
        via: "products.speciesId",
      },
      {
        label: "Shipment → Supplier",
        cardinality: "many-to-one",
        via: "shipments.supplierId",
      },
      {
        label: "Event ↔ Species",
        cardinality: "many-to-many",
        via: "eventSpecies",
      },
    ],
    requiredOriginFormat: REQUIRED_ORIGIN_FORMAT,
  };
}

export function updateKnowledge(nextKnowledge) {
  const current = state.knowledge;

  const nextSpecies = normalizeArrayRows(
    nextKnowledge.species ?? current.species,
    "SP",
  );
  const nextSuppliers = normalizeArrayRows(
    nextKnowledge.suppliers ?? current.suppliers,
    "SUP",
  );
  const nextProducts = normalizeArrayRows(
    nextKnowledge.products ?? current.products,
    "P",
  );
  const nextShipments = normalizeArrayRows(
    nextKnowledge.shipments ?? current.shipments,
    "S",
  );

  state.knowledge = {
    ...current,
    company: {
      ...current.company,
      ...(nextKnowledge.company || {}),
    },
    suppliers: nextSuppliers,
    distributors: normalizeArrayRows(
      nextKnowledge.distributors ?? current.distributors,
      "DIST",
    ),
    locations: normalizeArrayRows(
      nextKnowledge.locations ?? current.locations,
      "LOC",
    ),
    certifications: normalizeArrayRows(
      nextKnowledge.certifications ?? current.certifications,
      "CERT",
    ),
    species: nextSpecies,
    products: nextProducts.map((product) => {
      const {
        formFactor: _ff,
        processingState: _ps,
        productionMethod: _pm,
        originCountry: _oc,
        originDetail: _od,
        presentation: _presentationStr,
        formFactors: _oldFormFactors,
        presentations: _oldPresentations,
        ...cleanProduct
      } = product;

      const formats =
        Array.isArray(product.formats) && product.formats.length > 0
          ? product.formats
          : (_oldFormFactors || [])
              .map((name) => ({ name, presentations: [] }))
              .concat(_ff ? [{ name: _ff, presentations: [] }] : []);

      const processingStates = Array.isArray(product.processingStates)
        ? product.processingStates
        : _ps
          ? [_ps.charAt(0).toUpperCase() + _ps.slice(1)]
          : [];
      const productionMethods = Array.isArray(product.productionMethods)
        ? product.productionMethods
        : _pm
          ? [_pm]
          : [];
      const origins = Array.isArray(product.origins)
        ? product.origins
        : _oc
          ? [{ country: _od || "", countryCode: _oc }]
          : [];
      const originFormat =
        origins[0]?.countryCode || product.label?.originFormat || "";

      return {
        ...cleanProduct,
        formats,
        processingStates,
        productionMethods,
        origins,
        speciesId:
          product.speciesId ||
          current.species.find(
            (sp) => sp.scientificName === product.scientificName,
          )?.id ||
          null,
        label: {
          scientificName:
            product.scientificName || product.label?.scientificName || "",
          catchMethod: product.label?.catchMethod || "",
          originFormat,
        },
        labelStatus: "Compliant",
        statusExplanation: "No active compliance blockers",
        relatedEventId: null,
      };
    }),
    supplierProducts: normalizeArrayRows(
      nextKnowledge.supplierProducts ?? current.supplierProducts,
      "SPM",
    ),
    shipments: nextShipments.map((shipment) => ({
      ...shipment,
      normalStatus: shipment.normalStatus || shipment.status || "In transit",
      status: shipment.status || "In transit",
      statusExplanation: "No active compliance blockers",
      relatedEventId: null,
    })),
    shipmentItems: normalizeArrayRows(
      nextKnowledge.shipmentItems ?? current.shipmentItems,
      "SI",
    ),
  };

  clearEntityFlags();
  return getKnowledge();
}
