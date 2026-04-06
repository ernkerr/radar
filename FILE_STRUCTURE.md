# Radar — File Structure

Reference for where things live. Keep this updated as the codebase evolves.

```
radar/
├── apps/
│   └── web/                        # Next.js frontend (dashboard, config, alerts)
│       ├── src/
│       │   ├── app/                # App Router — pages and layouts
│       │   │   ├── (auth)/         # Auth pages (login, signup, invite)
│       │   │   ├── dashboard/      # Main dashboard — alert feed, status overview
│       │   │   ├── config/         # Company config — suppliers, products, species, origins
│       │   │   ├── alerts/         # Alert detail views, filtering, search
│       │   │   ├── actions/        # Action queue — pending approvals, execution history
│       │   │   ├── api/            # Next.js API routes (light CRUD, auth helpers)
│       │   │   └── layout.tsx      # Root layout with nav, auth provider
│       │   ├── components/         # Shared React components
│       │   │   ├── ui/             # Generic UI primitives (buttons, cards, badges)
│       │   │   ├── alerts/         # Alert-specific components (feed, detail, severity badge)
│       │   │   ├── actions/        # Action queue, approval buttons, execution status
│       │   │   ├── config/         # Config panel sections (suppliers, products, sources)
│       │   │   └── layout/         # Nav, sidebar, notification center
│       │   ├── lib/                # Client-side utilities
│       │   │   ├── supabase.ts     # Supabase client init + typed helpers
│       │   │   ├── hooks/          # Custom React hooks (useAlerts, useActions, etc.)
│       │   │   └── utils.ts        # Shared formatting, date helpers
│       │   └── types/              # TypeScript type definitions
│       │       ├── database.ts     # Generated Supabase types (from schema)
│       │       └── domain.ts       # App-level types (Alert, Action, Company, etc.)
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── services/
│   └── workers/                    # Python backend — ingestion, detection, agents
│       ├── ingestion/              # One module per data source
│       │   ├── __init__.py
│       │   ├── base.py             # Base ingestion class (shared fetch/store/log logic)
│       │   ├── federal_register.py # Federal Register API — structured REST, most reliable
│       │   ├── fda_import_alerts.py# FDA Import Alert pages — HTML scraping + diffing
│       │   ├── noaa_simp.py        # NOAA SIMP page monitoring
│       │   ├── rss_feeds.py        # Generic RSS feed ingestion (FDA weekly, etc.)
│       │   └── page_monitor.py     # Generic page monitor (fetch, hash, diff, store)
│       ├── detection/              # Change detection engine
│       │   ├── __init__.py
│       │   ├── differ.py           # Content hashing + diff generation
│       │   └── change_classifier.py# Categorize changes (new doc, modified, removed)
│       ├── agents/                 # Logic engine — relevance, dispatching, execution
│       │   ├── __init__.py
│       │   ├── relevance.py        # Hybrid scoring: deterministic rules + Claude LLM
│       │   ├── rules.py            # Deterministic rule definitions (species+origin matching)
│       │   ├── dispatcher.py       # Decides WHAT actions to take, creates action records
│       │   ├── executor.py         # Runs approved actions (calls TinyFish, creates tasks)
│       │   └── tinyfish_client.py  # TinyFish API wrapper for ERP/WMS/QMS execution
│       ├── celeryconfig.py         # Celery settings (broker URL, schedules, retries)
│       ├── tasks.py                # Celery task definitions (ingest, detect, analyze, execute)
│       ├── config.py               # Environment config (API keys, DB URLs, etc.)
│       ├── requirements.txt        # Python dependencies
│       └── Dockerfile              # Container for deploying workers
│
├── supabase/
│   ├── migrations/                 # SQL migrations — schema changes tracked here
│   │   └── 001_initial_schema.sql  # Companies, users, sources, documents, alerts, actions
│   ├── seed.sql                    # Dev seed data (test company, sample products)
│   └── config.toml                 # Supabase project config
│
├── DECISIONS.md                    # Decision log — check before implementing anything
├── FILE_STRUCTURE.md               # This file — update when structure changes
├── PLAN.md                         # Implementation plan (created from planning phase)
└── README.md                       # Project overview and setup instructions
```

## Naming Conventions

- **company_id** (not tenant_id) — we call them "companies" throughout the system
- **Python**: snake_case for files, functions, variables
- **TypeScript**: camelCase for variables/functions, PascalCase for components/types
- **Database**: snake_case for tables and columns
- **Ingestion modules**: named after their data source (e.g., `federal_register.py`)
- **Components**: grouped by feature domain (alerts/, actions/, config/)
