-- Radar: Row-Level Security Policies
-- Every company-scoped table is locked down so users can only see their own company's data (D2, D13)

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table companies enable row level security;
alter table users enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table shipments enable row level security;
alter table changes enable row level security;
alter table alerts enable row level security;
alter table actions enable row level security;
alter table approvals enable row level security;
alter table executions enable row level security;
alter table audit_log enable row level security;

-- Sources, raw_documents, and ingestion_log are shared/global — no RLS needed
-- (all companies see the same regulatory sources)

-- ============================================================
-- HELPER: get current user's company_id
-- ============================================================

create or replace function public.get_company_id()
returns uuid as $$
  select company_id from public.users where id = auth.uid()
$$ language sql security definer stable;

-- ============================================================
-- POLICIES
-- ============================================================

-- Companies: users can only see their own company
create policy "Users can view own company"
  on companies for select
  using (id = public.get_company_id());

-- Users: can see other users in their company
create policy "Users can view company members"
  on users for select
  using (company_id = public.get_company_id());

-- Suppliers: full CRUD scoped to company
create policy "Company suppliers select"
  on suppliers for select using (company_id = public.get_company_id());
create policy "Company suppliers insert"
  on suppliers for insert with check (company_id = public.get_company_id());
create policy "Company suppliers update"
  on suppliers for update using (company_id = public.get_company_id());
create policy "Company suppliers delete"
  on suppliers for delete using (company_id = public.get_company_id());

-- Products: full CRUD scoped to company
create policy "Company products select"
  on products for select using (company_id = public.get_company_id());
create policy "Company products insert"
  on products for insert with check (company_id = public.get_company_id());
create policy "Company products update"
  on products for update using (company_id = public.get_company_id());
create policy "Company products delete"
  on products for delete using (company_id = public.get_company_id());

-- Shipments: full CRUD scoped to company
create policy "Company shipments select"
  on shipments for select using (company_id = public.get_company_id());
create policy "Company shipments insert"
  on shipments for insert with check (company_id = public.get_company_id());
create policy "Company shipments update"
  on shipments for update using (company_id = public.get_company_id());
create policy "Company shipments delete"
  on shipments for delete using (company_id = public.get_company_id());

-- Changes: read-only for company users (system writes these)
create policy "Company changes select"
  on changes for select using (company_id = public.get_company_id());

-- Alerts: read + update (acknowledge/resolve) scoped to company
create policy "Company alerts select"
  on alerts for select using (company_id = public.get_company_id());
create policy "Company alerts update"
  on alerts for update using (company_id = public.get_company_id());

-- Actions: read + update (approve/reject) scoped to company
create policy "Company actions select"
  on actions for select using (company_id = public.get_company_id());
create policy "Company actions update"
  on actions for update using (company_id = public.get_company_id());

-- Approvals: users can view and create approvals for their company's actions
create policy "Company approvals select"
  on approvals for select
  using (action_id in (select id from actions where company_id = public.get_company_id()));
create policy "Company approvals insert"
  on approvals for insert
  with check (action_id in (select id from actions where company_id = public.get_company_id()));

-- Executions: read-only for company users
create policy "Company executions select"
  on executions for select
  using (action_id in (select id from actions where company_id = public.get_company_id()));

-- Audit log: read-only for company users
create policy "Company audit select"
  on audit_log for select using (company_id = public.get_company_id());
