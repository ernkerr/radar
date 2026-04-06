# Radar — Decision Log

Decisions made during planning and development. Check this before executing on any work to ensure alignment.

---

## Product Decisions

### D1: Product Name — "Radar"
- **Date**: 2026-04-04
- **Decision**: Product is called Radar. "Aquanor Ice Fresh" / "Aquanor Command" is the first target customer, not the product name.

### D2: SaaS, Multi-Tenant from Day 1
- **Date**: 2026-04-04
- **Decision**: Build as a multi-tenant SaaS platform. Design data model, auth, and tenant isolation from the start — not bolted on later.

### D3: Start Fresh, Demo is Reference Only
- **Date**: 2026-04-04
- **Decision**: The existing Next.js prototype (Aquanor Command) was built for demo/video purposes only. The real system will be built fresh. The demo can be referenced for UI patterns but is not the starting codebase.

## Architecture Decisions

### D4: Human-in-the-Loop is Configurable
- **Date**: 2026-04-04
- **Decision**: Approval gates between dispatch and execution are configurable per action type. Default: human approval required for everything. Over time, tenants can allow autonomous execution for low-risk actions. The system must be designed with this progression in mind.

### D5: Hybrid Relevance Detection
- **Date**: 2026-04-04
- **Decision**: Use deterministic rules for known patterns (species + origin + supplier matching) and LLM (Claude) for ambiguous or novel regulatory changes. Rules first, LLM second.

### D6: Orchestration vs Execution Separation
- **Date**: 2026-04-04
- **Decision**: Agent Dispatching Layer (decides WHAT to do, routes actions) is separate from Execution Layer (actually DOES it via TinyFish, APIs, etc.). Approval gate sits between them.

### D7: TinyFish as Execution Layer for Legacy Systems
- **Date**: 2026-04-04
- **Decision**: Use TinyFish API to interact with ERPs, WMS, and QMS that don't have native APIs or MCP servers. TinyFish turns web interfaces into programmable surfaces. Have API access, not yet tested.

## Data & Infrastructure Decisions

### D8: All Three Regulatory Sources are Equal Priority
- **Date**: 2026-04-04
- **Decision**: FDA Import Alerts, NOAA SIMP, and Federal Register API are all equally critical for MVP. Don't deprioritize any of them.

### D9: All Four Action Types in Scope
- **Date**: 2026-04-04
- **Decision**: Alert triage, compliance task creation, ERP/WMS updates, and supplier outreach drafting are all in scope. Not just alerting.

### D10: Tech Stack and Database — Open to Recommendation
- **Date**: 2026-04-04
- **Decision**: No strong commitment to specific stack. Claude recommended for LLM in MVP. Database, backend, and infra to be decided as part of planning.

### D11: Notifications — In-App First
- **Date**: 2026-04-04
- **Decision**: P1 is in-app notifications only. Email notifications deferred to P2.

### D12: Company Onboarding — Manual Config + Future System Sync
- **Date**: 2026-04-04
- **Decision**: Start with manual config UI (admin panel for suppliers, species, origins, certifications). Later add ability to sync/import from ERP/WMS via TinyFish.

### D13: Use "company" not "tenant" in code and data model
- **Date**: 2026-04-04
- **Decision**: Use `company_id` instead of `tenant_id` throughout the codebase, database schema, and documentation. The table is `companies`, not `tenants`. More intuitive and domain-aligned.

### D14: FILE_STRUCTURE.md is the source of truth for project layout
- **Date**: 2026-04-04
- **Decision**: Maintain `FILE_STRUCTURE.md` at the project root with annotated directory structure. Update it whenever the project structure changes.

### D15: 7 regulatory sources for MVP, 6 deferred
- **Date**: 2026-04-05 (updated 2026-04-06)
- **Decision**: MVP includes 7 sources across 3 methods:
  - **APIs**: Federal Register, openFDA enforcement
  - **RSS**: FDA Food Safety Recalls, FDA Outbreaks
  - **Page monitoring**: NOAA SIMP, CBP WROs, NOAA MMPA, USDA FSIS Recalls
  - **Deferred**: FDA CSMS (email-only), FDA Import Refusals (fragile scraping), EU RASFF (unclear API), EPA Fish Advisories (annual/low priority), Health Canada (not relevant for US imports), NOAA Fisheries RSS (no RSS available, JS-rendered)

### D17: Never assume — ambiguous matches must surface for human review
- **Date**: 2026-04-06
- **Decision**: The relevance engine must NEVER silently discard a change it's unsure about. Three states:
  - **Relevant** (high confidence) → create alert + propose actions
  - **Needs Review** (ambiguous) → create alert flagged for manual review, no auto-actions
  - **Not Relevant** (high confidence) → skip
  - If in doubt, default to "Needs Review". False negatives are more expensive than false positives — a missed regulatory change on a large shipment can cost thousands.
  - The LLM must explicitly state its confidence level. If confidence is below a threshold, it must flag for review rather than deciding.

### D16: FDA switched from HTML scraping to openFDA API
- **Date**: 2026-04-05
- **Decision**: Original plan was to scrape FDA Import Alert 16-xx pages. Those URLs are now 404. Switched to the openFDA food/enforcement API which provides structured recall data. No auth required.
