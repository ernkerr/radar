# Radar — Implementation Plan

## Context

Radar is a multi-company SaaS that monitors regulatory sources (FDA, NOAA, CBP, Federal Register), detects changes relevant to a seafood importer's context (suppliers, species, geographies), and triggers workflows — from creating compliance tasks to updating ERPs via TinyFish.

The existing Next.js prototype at `/Users/ern/Desktop/radar-test` is demo-only. This plan covers building the real system from scratch.

**First customer**: Aquanor Ice Fresh (Boston, 3 staff manually tracking FDA/NOAA/CBP today).

**All decisions are logged in**: `DECISIONS.md` at project root.

---

## Recommended Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 14 + TypeScript + Tailwind | You already know it, SSR for dashboard perf, App Router for layouts |
| **Backend API** | Next.js API Routes (light) + Python FastAPI (heavy lifting) | Python is the better ecosystem for scraping, NLP, LLM tooling, feedparser, BeautifulSoup. Next.js routes handle auth/CRUD. FastAPI handles ingestion workers and agent logic. |
| **Database** | Supabase (hosted Postgres) | Built-in auth, Row-Level Security for multi-tenancy, realtime subscriptions for in-app notifications, JSONB for flexible regulatory data, generous free tier |
| **Task Queue** | BullMQ (Redis-backed) or Celery (Python) | Scheduled ingestion jobs, retry logic, rate limiting. BullMQ if you go all-Node, Celery if Python workers. **Recommendation: Celery** since workers are Python. |
| **Job Scheduling** | Celery Beat (cron-like scheduling for ingestion) | Runs alongside Celery workers, configurable per-source schedules |
| **LLM** | Claude (Anthropic SDK) | For relevance reasoning on ambiguous changes, action plan generation, supplier outreach drafting |
| **Execution** | TinyFish API | For ERP/WMS/QMS actions on systems without APIs |
| **Hosting** | Vercel (frontend) + Railway or Render (Python workers + Redis) | Vercel for Next.js is natural. Railway/Render for long-running Python workers and Redis. Could migrate to AWS ECS later. |
| **Monitoring** | Sentry (errors) + simple health check table in Supabase | Track ingestion job success/failure per source |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS FRONTEND                         │
│  Dashboard · Config Panel · Alert Feed · Action Queue · Approvals│
└──────────────────────────┬──────────────────────────────────────┘
                           │ Supabase Client + API Routes
┌──────────────────────────┴──────────────────────────────────────┐
│                      SUPABASE (POSTGRES)                        │
│  Companies · Users · Sources · RawDocuments · Changes · Alerts  │
│  Actions · Approvals · Executions · AuditLog                    │
│  Row-Level Security per company_id                              │
└──────────┬────────────────────────────┬─────────────────────────┘
           │                            │
┌──────────┴───────────┐  ┌─────────────┴─────────────────────────┐
│   INPUT LAYER        │  │   LOGIC + EXECUTION LAYER              │
│   (Python Workers)   │  │   (Python Workers)                     │
│                      │  │                                        │
│  Celery Beat         │  │  Change Detection                      │
│  ├─ FDA Alerts       │  │  ├─ Diff engine (new docs, page diffs) │
│  ├─ NOAA SIMP        │  │  ├─ Rule-based relevance matching      │
│  ├─ Federal Register │  │  ├─ LLM relevance (Claude) for novel   │
│  ├─ RSS Feeds        │  │  │                                      │
│  ├─ Page Monitor     │  │  Agent Dispatching                     │
│  └─ Health Checks    │  │  ├─ Classify urgency (HIGH/MED/LOW)    │
│                      │  │  ├─ Generate action plan                │
│  Writes to:          │  │  ├─ Route to approval queue             │
│  raw_documents       │  │  │                                      │
│  ingestion_log       │  │  Execution (post-approval)             │
│                      │  │  ├─ TinyFish agents (ERP/WMS/QMS)      │
└──────────────────────┘  │  ├─ Internal task creation              │
                          │  ├─ Supplier outreach drafts            │
                          │  └─ Audit log                           │
                          └────────────────────────────────────────┘
```

---

## Data Model (Key Entities)

```sql
-- Multi-tenancy: every table has company_id, RLS policies filter by it

companies (id, name, slug, settings_json, created_at)

users (id, company_id, email, role, notification_prefs, created_at)

-- What the company cares about
suppliers (id, company_id, name, country, certifications, active)
products (id, company_id, name, species, scientific_name, origin, 
          simp_covered, formats[], production_method)
shipments (id, company_id, product_id, supplier_id, status, 
           origin_country, eta, compliance_status)

-- Data ingestion
sources (id, name, type[api|rss|page_monitor], url, schedule_cron, 
         last_checked, status, config_json)
raw_documents (id, source_id, external_id, content_hash, raw_content, 
               metadata_json, fetched_at)
ingestion_log (id, source_id, status[success|failure], error_message, 
               duration_ms, records_fetched, ran_at)

-- Change detection & relevance
changes (id, company_id, raw_document_id, change_type[new|modified|removed],
         diff_summary, detected_at)
alerts (id, company_id, change_id, title, summary, why_it_matters,
        relevance_score, urgency[HIGH|MED|LOW], 
        matched_rules[], llm_reasoning, status[new|acknowledged|resolved],
        created_at)

-- Action pipeline
actions (id, company_id, alert_id, action_type[task|erp_update|outreach|hold],
         description, payload_json, requires_approval, 
         status[pending|approved|rejected|executing|completed|failed],
         created_at)
approvals (id, action_id, user_id, decision[approved|rejected], 
           notes, decided_at)
executions (id, action_id, executor[tinyfish|internal|manual],
            request_json, response_json, status, started_at, completed_at)

-- Audit
audit_log (id, company_id, user_id, entity_type, entity_id, 
           action, details_json, created_at)
```

---

## Regulatory Source Details

### FDA Import Alerts
- **URL**: https://www.fda.gov/industry/actions-enforcement/import-alerts
- **Method**: Page monitoring (HTML scraping) + RSS where available
- **Schedule**: Every 1 hour
- **What to capture**: Alert number, product/species, country, firm, charge, date modified
- **Relevance matching**: Compare species + country against company's products and suppliers

### NOAA SIMP (Seafood Import Monitoring Program)
- **URL**: https://www.fisheries.noaa.gov/international/seafood-import-monitoring-program
- **Method**: Page monitoring for species list changes, enforcement updates
- **Schedule**: Every 6 hours (changes less frequently)
- **What to capture**: Species additions/removals, reporting requirement changes
- **Relevance matching**: Compare against company's SIMP-covered species

### Federal Register
- **API**: https://www.federalregister.gov/developers/documentation/api/v1
- **Method**: REST API (structured, well-documented)
- **Schedule**: Every 2 hours
- **Query**: Filter by agencies (FDA, NOAA, CBP, USDA) + keywords (seafood, fish, import, HACCP, SIMP)
- **What to capture**: Document type (rule, proposed rule, notice), title, abstract, dates, agencies
- **Relevance matching**: LLM analysis of abstract against company context

### Additional Sources (P1+)
- FDA CSMS messages (if API available)
- FDA GovDelivery email subscriptions
- CBP Withhold Release Orders (page monitoring)
- NOAA MMPA Import Provisions

---

## Phased Implementation

### P0 — Foundation (Weeks 1-3)
**Goal**: Core infrastructure, auth, company config, first live data source

- [ ] Project scaffolding: Next.js app (TypeScript), Python FastAPI service, Supabase project
- [ ] Supabase schema: companies, users, sources, raw_documents, ingestion_log
- [ ] Auth: Supabase Auth with RLS policies on company_id
- [ ] Company config UI: Company info, suppliers, products, species (evolve from demo's ConfigPanel)
- [ ] First ingestion worker: Federal Register API (it's the most structured/reliable)
- [ ] Ingestion monitoring: Log success/failure per run, surface in admin UI
- [ ] Basic dashboard shell: Nav, config, raw feed of ingested documents

### P1 — Detection & Alerts (Weeks 4-7)
**Goal**: All sources live, change detection, relevance engine, in-app alerts, action queue

- [ ] FDA Import Alerts scraper (page monitoring + diffing)
- [ ] NOAA SIMP scraper (page monitoring)
- [ ] RSS feed ingestion (FDA weekly notifications)
- [ ] Change detection engine: content hashing, diff generation, new document detection
- [ ] Rule-based relevance matching: species + origin + supplier cross-reference
- [ ] LLM relevance analysis: Claude reads change + company context, scores relevance
- [ ] Alert generation: title, summary, "why it matters", urgency classification
- [ ] In-app alert feed with filtering (urgency, source, status)
- [ ] Action queue: system proposes actions per alert
- [ ] Approval workflow UI: review proposed actions, approve/reject
- [ ] Supabase Realtime for live alert notifications in dashboard

### P2 — Execution & Outreach (Weeks 8-11)
**Goal**: TinyFish integration, actual action execution, supplier communications

- [ ] TinyFish API integration: test and build execution adapter
- [ ] Action executors: ERP hold, WMS flag, QMS task creation via TinyFish
- [ ] Supplier outreach: LLM drafts email/message based on alert context, user edits and sends
- [ ] Compliance task management: internal task board for follow-ups
- [ ] Email notifications (configurable per user)
- [ ] Execution audit trail: what was done, when, by whom/what, result
- [ ] Configurable autonomy: per-action-type toggle for auto-execute vs require approval

### P3 — Scale & Intelligence (Weeks 12+)
**Goal**: More sources, smarter agents, analytics

- [ ] Additional sources: CBP WROs, NOAA MMPA, FDA CSMS, EU RASFF
- [ ] Company onboarding from ERP: TinyFish pulls supplier/product data into Radar
- [ ] Analytics dashboard: compliance posture, alert trends, response times
- [ ] Multi-model support: evaluate Claude vs other models per task
- [ ] Webhook integrations: Slack/Teams notifications
- [ ] Advanced autonomy: ML-based confidence scoring for auto-execution decisions

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| FDA/NOAA pages change HTML structure, breaking scrapers | Content hash + alerting on scrape failures. Use CSS selectors with fallbacks. Monitor ingestion_log for failures. |
| Rate limiting on Federal Register API | Respect rate limits, use exponential backoff, cache responses |
| TinyFish reliability for critical ERP actions | Always log pre/post state, implement retry logic, require human approval for high-risk actions initially |
| LLM hallucination on relevance scoring | Hybrid approach: rules catch known patterns deterministically, LLM only for genuinely novel/ambiguous changes. Always show reasoning to user. |
| Multi-tenancy data leakage | Supabase RLS on every table, company_id in every query, integration tests for isolation |
| Scraping legality | Federal government sources are public domain. Monitor ToS for any restrictions. |

---

## Verification Plan

- **Ingestion**: Run each source worker independently, verify data lands in raw_documents with correct metadata
- **Change Detection**: Ingest same source twice with known changes, verify diffs are detected
- **Relevance**: Create test company with known products/suppliers, inject test regulatory change, verify correct relevance score
- **Actions**: Trigger a test alert, verify action is proposed, approval workflow works, execution logged
- **Multi-tenancy**: Create two companies, verify company A cannot see company B's data
- **Failure handling**: Kill a worker mid-run, verify ingestion_log records failure, next run recovers

---

## File Structure

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for the full annotated directory layout. Keep that file updated as the codebase evolves.
