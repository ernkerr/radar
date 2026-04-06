# Changelog

All significant codebase changes are documented here.

---

## 2026-04-06 — Skeleton Loading States & Design System

**What changed:**
- Installed shadcn/ui (skeleton component, cn utility, Tailwind 4 theme bridge)
- Added shimmer skeleton loading states to all config pages (Company, Suppliers, Products, Sources, Ingestion Monitor)
- Created reusable skeleton pattern library: `FormSkeleton`, `TableSkeleton`, `CardGridSkeleton`, `SourceListSkeleton`, `PageContentSkeleton`
- Config page now renders page shell (nav, heading, tabs) immediately instead of blank while loading
- Added `SKELETONS.md` design system guide for adding skeletons to future components
- Registered CSS variables with Tailwind 4's `@theme` system for shadcn compatibility

**Why:** Config pages flashed empty content while data loaded from Supabase — misleading "No items" messages and blank screens. Skeleton design system ensures all future data-fetching components follow the same loading UX pattern.

---

## 2026-04-06 — P1: Change Detection, Relevance Engine, Alerts & Actions

**What changed:**
- Change detection engine compares ingestion runs and detects new/modified documents
- Rule-based relevance matching: species, origin, supplier, SIMP cross-referencing
- LLM relevance (Claude) for ambiguous changes (hybrid approach, D5)
- Alert dispatch with proposed actions (review tasks, outreach, ERP updates, holds)
- Alert feed UI with urgency/status filtering, expandable detail, acknowledge/resolve
- Action queue with approve/reject workflow and approval records
- Dashboard shows real alert + action counts
- Seeded Aquanor with 3 suppliers, 11 products from demo data
- Pipeline tested: 34 alerts, 39 actions generated from real regulatory data

**Why:** P1 core is functionally complete. The system now detects regulatory changes, determines relevance to a company, generates alerts with context, and proposes actions for human approval.

---

## 2026-04-06 — Auth, Config CRUD, Live Dashboard

**What changed:**
- Supabase Auth: login, signup, middleware, session handling
- Config page wired to Supabase: company info (save), suppliers (CRUD), products (CRUD), sources (read)
- Dashboard shows real data: company name, source count, recent ingested documents table
- USDA FSIS Recalls added as 7th ingestion source
- AppNav shows user email + sign out

**Why:** P0 is now functionally complete. The system ingests real regulatory data, stores it in a multi-tenant database, and surfaces it through an authenticated UI with company-scoped configuration.

---

## 2026-04-06 — Auth + 7th Source (USDA FSIS)

**What changed:**
- Added Supabase Auth: login, signup, middleware, session handling
- Signup creates company + user record (multi-tenant from day 1, D2)
- Middleware protects all routes except /login and /signup
- AppNav shows user email + sign out
- Added USDA FSIS Recalls as 7th ingestion source

**Why:** Auth is the foundation for multi-tenancy. Without it, we can't scope data to companies or build the config/alert UIs against real user sessions.

---

## 2026-04-05 — All 6 Regulatory Sources Live

**What changed:**
- Added 3 new ingestion sources: FDA RSS Feeds, CBP Withhold Release Orders, NOAA MMPA Import Provisions
- Switched FDA ingester from broken HTML scraping to openFDA enforcement API
- Fixed NOAA SIMP URLs (species list was 404, replaced with Essential Forms + Facts & Reports)
- Fixed NOAA MMPA URL (import provisions rule was 404, replaced with bycatch criteria page)
- Refactored test_ingest.py to support all sources: `python test_ingest.py [source|all]`
- All 6 sources tested and ingesting into Supabase

**Sources now live:**
| Source | Method | Records |
|--------|--------|---------|
| Federal Register | REST API | 96 |
| FDA Import Alerts | openFDA API | 5 |
| NOAA SIMP | Page monitoring (3 pages) | 3 |
| FDA RSS Feeds | RSS (2 feeds) | 40 |
| CBP Withhold Release Orders | Page monitoring | 1 |
| NOAA MMPA Import Provisions | Page monitoring (2 pages) | 2 |

**Why:** Building all ingesters now means the change detection and relevance engine will be designed against the full variety of data formats (JSON APIs, RSS/XML, HTML page content).

---

## 2026-04-05 — Database Schema & RLS Policies

**What changed:**
- Added initial Supabase migration (`supabase/migrations/001_initial_schema.sql`) with 13 tables covering the full data model
- Added RLS policies migration (`supabase/migrations/002_rls_policies.sql`) for multi-tenancy isolation via `company_id`
- Seeded three default regulatory sources (Federal Register, FDA Import Alerts, NOAA SIMP)

**Tables:** companies, users, suppliers, products, shipments, sources, raw_documents, ingestion_log, changes, alerts, actions, approvals, executions, audit_log

**Decisions referenced:** D2 (multi-tenant from day 1), D13 (company_id naming)

**Why:** Foundation for all data storage. RLS ensures company A can never see company B's data at the database level.

---

## 2026-04-04 — P0 Scaffold: Frontend, Workers, Ingestion

**What changed:**
- Added company config page (`apps/web/src/app/config/page.tsx`) with tabs for company info, suppliers, products, and monitored sources
- Scaffolded Python workers service (`services/workers/`) with Celery + Redis task queue, base ingester class, and project config
- Built three ingestion workers:
  - **Federal Register** — REST API with keyword + agency filtering
  - **FDA Import Alerts** — HTML scraping of Import Alert 16-xx (seafood)
  - **NOAA SIMP** — Page monitoring of species list and program pages
- Base ingester handles content hashing, deduplication, and ingestion logging (success/failure)
- Celery beat schedule: Federal Register every 2h, FDA every 1h, NOAA every 6h

**Decisions referenced:** D8 (all three sources equal priority), D12 (manual config UI first), D13 (company_id naming)

**Why:** First step toward replacing hardcoded demo data with real regulatory data ingestion. These workers will feed the change detection and relevance engine in P1.

---

## 2026-04-04 — Branching & Environment Setup

**What changed:**
- Created `demo` branch as a frozen snapshot of the current demo
- Created `dev` and `staging` branches from `main`
- `main` is now the production branch (Vercel production)
- Cleaned up broken `main 2` git ref

**Branching strategy:**
| Branch | Purpose | Deploys to |
|---|---|---|
| `demo` | Frozen demo snapshot | GitHub Pages |
| `dev` | Active development | Vercel preview |
| `staging` | Pre-production review | Vercel preview |
| `main` | Published production | Vercel production |

**Promotion flow:** `feature branches -> dev -> staging -> main`

**Why:** Needed to preserve the demo while building out the real product. Vercel handles multi-environment deployments natively.
