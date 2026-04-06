# Radar

Compliance monitoring for seafood importers. Radar continuously monitors regulatory sources (FDA, NOAA, CBP, USDA), detects changes relevant to your company's products and suppliers, and generates alerts with proposed actions.

## How it works

1. **Ingestion** — 7 regulatory data sources are fetched on a schedule (APIs, RSS feeds, page monitoring)
2. **Change Detection** — New and modified documents are identified by comparing content hashes across runs
3. **Relevance Analysis** — Each change is scored against your company's products (species, origins) and suppliers using rule-based matching + optional LLM analysis (Claude)
4. **Alert Dispatch** — Relevant changes become alerts with urgency levels, explanations, and proposed actions
5. **Approval Workflow** — Actions require human approval before execution (configurable per action type)

## Data sources

| Source | Method | What it provides |
|--------|--------|-----------------|
| Federal Register | REST API | Proposed rules, final rules, notices from FDA/NOAA/CBP |
| openFDA Enforcement | REST API | Seafood recalls, market withdrawals, safety alerts |
| FDA RSS Feeds | RSS | Food safety recalls and outbreak investigations |
| NOAA SIMP | Page monitoring | Seafood Import Monitoring Program updates |
| NOAA MMPA | Page monitoring | Marine mammal bycatch import provisions |
| CBP WROs | Page monitoring | Forced labor withhold release orders |
| USDA FSIS | Page monitoring | Meat/poultry/seafood recalls |

## Project structure

```
apps/web/          — Next.js frontend (dashboard, config, alerts, actions)
services/workers/  — Python backend (ingestion, detection, agents)
supabase/          — Database migrations and RLS policies
```

See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for the full annotated layout.

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+ (3.14 has compatibility issues with pydantic)
- A Supabase project ([supabase.com](https://supabase.com))

### Frontend (Next.js)

```bash
cd apps/web
cp .env.local.example .env.local    # Fill in your Supabase URL and keys
npm install
npm run dev
```

### Workers (Python)

```bash
cd services/workers
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env               # Fill in your Supabase URL and service key
```

### Database

Run the migrations in your Supabase SQL Editor (in order):
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### Manual ingestion test

```bash
cd services/workers
source .venv/bin/activate
python test_ingest.py all                        # Ingest all sources
python test_ingest.py federal_register           # Ingest one source
python test_ingest.py pipeline federal_register  # Run detection + alerts
python test_ingest.py pipeline all --llm         # With Claude analysis
```

## Key decisions

All architectural decisions are logged in [DECISIONS.md](DECISIONS.md). Key ones:

- **D2**: Multi-tenant from day 1 (company_id on every table, RLS policies)
- **D5**: Hybrid relevance detection (deterministic rules first, LLM for ambiguous changes)
- **D4**: Human-in-the-loop configurable per action type (defaults to approval required)
- **D15**: 7 regulatory sources for MVP

## Documentation

- [PLAN.md](PLAN.md) — Implementation plan with architecture and phased roadmap
- [DECISIONS.md](DECISIONS.md) — Decision log (check before making changes)
- [FILE_STRUCTURE.md](FILE_STRUCTURE.md) — Annotated directory layout
- [CHANGELOG.md](CHANGELOG.md) — History of significant changes
- [P2.md](P2.md) — Deferred features for future phases
