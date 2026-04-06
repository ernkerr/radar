-- Radar: Initial Schema
-- Multi-tenancy via company_id + Row-Level Security (D2, D13)

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- COMPANIES & USERS
-- ============================================================

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  settings_json jsonb default '{}',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  email text not null unique,
  role text not null default 'member',
  notification_prefs jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_users_company on users(company_id);

-- ============================================================
-- COMPANY CONTEXT (what the company cares about)
-- ============================================================

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  country text not null,
  certifications text[] default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_suppliers_company on suppliers(company_id);

create table products (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  species text not null,
  scientific_name text,
  origin text not null,
  simp_covered boolean not null default false,
  formats text[] default '{}',
  production_method text,
  created_at timestamptz not null default now()
);

create index idx_products_company on products(company_id);

create table shipments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid references products(id),
  supplier_id uuid references suppliers(id),
  status text not null default 'in_transit',
  origin_country text not null,
  eta timestamptz,
  compliance_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index idx_shipments_company on shipments(company_id);

-- ============================================================
-- DATA INGESTION
-- ============================================================

create table sources (
  id text primary key,  -- e.g. 'federal_register', 'fda_import_alerts'
  name text not null,
  source_type text not null check (source_type in ('api', 'rss', 'page_monitor')),
  url text not null,
  schedule_cron text,
  last_checked timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'error')),
  config_json jsonb default '{}',
  created_at timestamptz not null default now()
);

create table raw_documents (
  id uuid primary key default uuid_generate_v4(),
  source_id text not null references sources(id),
  external_id text,
  content_hash text not null,
  raw_content text not null,
  metadata_json jsonb default '{}',
  fetched_at timestamptz not null default now()
);

create index idx_raw_docs_source on raw_documents(source_id);
create index idx_raw_docs_hash on raw_documents(source_id, content_hash);
create index idx_raw_docs_external on raw_documents(source_id, external_id);

create table ingestion_log (
  id uuid primary key default uuid_generate_v4(),
  source_id text not null references sources(id),
  status text not null check (status in ('success', 'failure')),
  error_message text,
  duration_ms integer,
  records_fetched integer not null default 0,
  ran_at timestamptz not null default now()
);

create index idx_ingestion_log_source on ingestion_log(source_id, ran_at desc);

-- ============================================================
-- CHANGE DETECTION & RELEVANCE
-- ============================================================

create table changes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  raw_document_id uuid not null references raw_documents(id),
  change_type text not null check (change_type in ('new', 'modified', 'removed')),
  diff_summary text,
  detected_at timestamptz not null default now()
);

create index idx_changes_company on changes(company_id, detected_at desc);

create table alerts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  change_id uuid references changes(id),
  title text not null,
  summary text,
  why_it_matters text,
  relevance_score real,
  urgency text not null default 'LOW' check (urgency in ('HIGH', 'MEDIUM', 'LOW')),
  matched_rules text[] default '{}',
  llm_reasoning text,
  status text not null default 'new' check (status in ('new', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now()
);

create index idx_alerts_company on alerts(company_id, created_at desc);
create index idx_alerts_status on alerts(company_id, status);

-- ============================================================
-- ACTION PIPELINE
-- ============================================================

create table actions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  alert_id uuid references alerts(id),
  action_type text not null check (action_type in ('task', 'erp_update', 'outreach', 'hold')),
  description text not null,
  payload_json jsonb default '{}',
  requires_approval boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'executing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index idx_actions_company on actions(company_id, created_at desc);
create index idx_actions_status on actions(company_id, status);

create table approvals (
  id uuid primary key default uuid_generate_v4(),
  action_id uuid not null references actions(id) on delete cascade,
  user_id uuid not null references users(id),
  decision text not null check (decision in ('approved', 'rejected')),
  notes text,
  decided_at timestamptz not null default now()
);

create index idx_approvals_action on approvals(action_id);

create table executions (
  id uuid primary key default uuid_generate_v4(),
  action_id uuid not null references actions(id) on delete cascade,
  executor text not null check (executor in ('tinyfish', 'internal', 'manual')),
  request_json jsonb default '{}',
  response_json jsonb default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz
);

create index idx_executions_action on executions(action_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details_json jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_audit_company on audit_log(company_id, created_at desc);

-- ============================================================
-- SEED: Default regulatory sources
-- ============================================================

insert into sources (id, name, source_type, url, schedule_cron) values
  ('federal_register', 'Federal Register', 'api', 'https://www.federalregister.gov/api/v1', '0 */2 * * *'),
  ('fda_import_alerts', 'FDA Import Alerts', 'api', 'https://api.fda.gov/food/enforcement.json', '0 * * * *'),
  ('noaa_simp', 'NOAA SIMP', 'page_monitor', 'https://www.fisheries.noaa.gov/international/international-affairs/seafood-import-monitoring-program', '0 */6 * * *'),
  ('fda_rss', 'FDA RSS Feeds', 'rss', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-safety-recalls/rss.xml', '0 * * * *'),
  ('cbp_wro', 'CBP Withhold Release Orders', 'page_monitor', 'https://www.cbp.gov/newsroom/stats/trade/withhold-release-orders-findings-dashboard', '0 */6 * * *'),
  ('noaa_mmpa', 'NOAA MMPA Import Provisions', 'page_monitor', 'https://www.fisheries.noaa.gov/foreign/marine-mammal-protection/mmpa-import-provisions-rule', '0 */12 * * *'),
  ('usda_fsis', 'USDA FSIS Recalls', 'page_monitor', 'https://www.fsis.usda.gov/recalls', '0 */2 * * *');
