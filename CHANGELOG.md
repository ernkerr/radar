# Changelog

All significant codebase changes are documented here.

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
