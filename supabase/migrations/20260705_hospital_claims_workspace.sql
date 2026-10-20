-- Hospital Claims Workspace schema
-- Keeps the Day1 hospital claims register separate from the generic claims engine
-- while preserving links back to members, providers, claims, documents, payments, and audit.

create extension if not exists pgcrypto;

create table if not exists public.hospital_claim_intakes (
  id uuid primary key default gen_random_uuid(),
  intake_number text unique,
  source_type text not null default 'manual_upload',
  source_reference text,
  document_type text not null default 'unknown',
  file_name text,
  file_url text,
  file_mime_type text,
  file_size_bytes bigint,
  status text not null default 'new',
  notification_status text not null default 'new',
  ocr_confidence numeric(5,2),
  ocr_fields jsonb not null default '{}'::jsonb,
  raw_text text,
  matched_member_id uuid references public.members(id),
  matched_register_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospital_claims_register (
  id uuid primary key default gen_random_uuid(),
  hcr_claim_number text unique,
  claim_id uuid references public.claims(id),
  intake_id uuid references public.hospital_claim_intakes(id),
  member_id uuid references public.members(id),
  provider_id uuid references public.providers(id),

  workspace_year integer,
  workspace_month integer,
  row_type text not null default 'claim',
  workbook_sheet text,
  workbook_row_number integer,
  source_workbook_file text,
  import_batch_id uuid,
  import_hash text unique,

  auth_number text,
  date_of_claim_reported_received text,
  dol text,
  claim_number text,
  member_number text,
  surname text,
  initials text,
  patient_name text,
  id_number_principal_member text,
  gender text,
  patient_dob text,
  relationship text,
  total_claims_incurred numeric(14,2) not null default 0,
  finalised_paid_to_date numeric(14,2) not null default 0,
  claims_outstanding numeric(14,2) not null default 0,
  actual_costs_invoices_received numeric(14,2) not null default 0,
  member_costs numeric(14,2) not null default 0,
  accident numeric(14,2) not null default 0,
  illness numeric(14,2) not null default 0,
  death numeric(14,2) not null default 0,
  dread numeric(14,2) not null default 0,
  extension numeric(14,2) not null default 0,
  casualty_admitted_hospital numeric(14,2) not null default 0,
  ex_gratia numeric(14,2) not null default 0,
  repudiation_claim_amount numeric(14,2) not null default 0,
  status text,
  group_name text,
  cause text,
  hospital text,
  length_of_stay text,
  beneficiary text,
  beneficiary_death_payment_id text,
  beneficiary_death_surname_initials text,
  payment_date text,
  plan text,
  inception_date text,
  icd10_code text,
  province text,
  policy_period text,
  practice_number text,

  extra_columns jsonb not null default '{}'::jsonb,
  formula_map jsonb not null default '{}'::jsonb,
  source_row jsonb not null default '{}'::jsonb,
  calculation_snapshot jsonb not null default '{}'::jsonb,
  data_quality_flags jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'hospital_claim_intakes_matched_register_fk'
  ) then
    alter table public.hospital_claim_intakes
      add constraint hospital_claim_intakes_matched_register_fk
      foreign key (matched_register_id) references public.hospital_claims_register(id);
  end if;
end $$;

create table if not exists public.hosp_claims (
  id uuid primary key default gen_random_uuid(),
  register_id uuid not null references public.hospital_claims_register(id) on delete cascade,
  intake_id uuid references public.hospital_claim_intakes(id),
  claim_id uuid references public.claims(id),
  hcr_claim_number text,
  status text not null default 'open',
  member_id uuid references public.members(id),
  provider_id uuid references public.providers(id),
  auth_number text,
  service_date text,
  reported_date text,
  claimed_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  outstanding_amount numeric(14,2) not null default 0,
  claim_type text,
  benefit_bucket text,
  assigned_to uuid,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(register_id)
);

create table if not exists public.hosp_claim_documents (
  id uuid primary key default gen_random_uuid(),
  hosp_claim_id uuid references public.hosp_claims(id) on delete cascade,
  register_id uuid references public.hospital_claims_register(id) on delete cascade,
  intake_id uuid references public.hospital_claim_intakes(id) on delete set null,
  document_type text not null default 'unknown',
  file_name text,
  file_url text,
  file_mime_type text,
  file_size_bytes bigint,
  ocr_data jsonb not null default '{}'::jsonb,
  uploaded_by uuid,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.hosp_claim_payments (
  id uuid primary key default gen_random_uuid(),
  hosp_claim_id uuid references public.hosp_claims(id) on delete cascade,
  register_id uuid references public.hospital_claims_register(id) on delete cascade,
  payment_date text,
  payment_amount numeric(14,2) not null default 0,
  payee_type text,
  payee_name text,
  payment_method text,
  payment_status text not null default 'pending',
  payment_reference text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hosp_claim_audit (
  id uuid primary key default gen_random_uuid(),
  hosp_claim_id uuid references public.hosp_claims(id) on delete cascade,
  register_id uuid references public.hospital_claims_register(id) on delete cascade,
  action text not null,
  performed_by uuid,
  previous_status text,
  new_status text,
  previous_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.hosp_claim_history (
  id uuid primary key default gen_random_uuid(),
  hosp_claim_id uuid references public.hosp_claims(id) on delete cascade,
  register_id uuid references public.hospital_claims_register(id) on delete cascade,
  event_type text not null,
  event_title text not null,
  event_detail text,
  event_data jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.hosp_claim_calculation_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  target_column text not null,
  source_formula text not null,
  rule_description text,
  is_active boolean not null default true,
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.hosp_claim_calculation_rules (rule_key, target_column, source_formula, rule_description)
values
  ('claims_outstanding', 'claims_outstanding', 'total_claims_incurred - finalised_paid_to_date', 'Matches the workbook outstanding calculation.'),
  ('balance_check', 'calculation_snapshot.balance_check', 'finalised_paid_to_date + claims_outstanding - total_claims_incurred', 'Workbook helper calculation used to validate paid/outstanding totals.'),
  ('benefit_bucket_check', 'calculation_snapshot.benefit_bucket_check', 'sum(accident:casualty_admitted_hospital) - total_claims_incurred', 'Workbook helper calculation used to compare benefit buckets to total incurred.')
on conflict (rule_key) do update set
  target_column = excluded.target_column,
  source_formula = excluded.source_formula,
  rule_description = excluded.rule_description,
  updated_at = now();

create index if not exists hospital_claims_register_member_number_idx on public.hospital_claims_register(member_number);
create index if not exists hospital_claims_register_member_id_idx on public.hospital_claims_register(member_id);
create index if not exists hospital_claims_register_claim_number_idx on public.hospital_claims_register(claim_number);
create index if not exists hospital_claims_register_auth_number_idx on public.hospital_claims_register(auth_number);
create index if not exists hospital_claims_register_status_idx on public.hospital_claims_register(status);
create index if not exists hospital_claims_register_year_month_idx on public.hospital_claims_register(workspace_year, workspace_month);
create index if not exists hospital_claims_register_hospital_idx on public.hospital_claims_register(hospital);
create index if not exists hosp_claims_register_id_idx on public.hosp_claims(register_id);
create index if not exists hosp_claim_documents_register_id_idx on public.hosp_claim_documents(register_id);
create index if not exists hosp_claim_payments_register_id_idx on public.hosp_claim_payments(register_id);
create index if not exists hosp_claim_audit_register_id_idx on public.hosp_claim_audit(register_id);
create index if not exists hosp_claim_history_register_id_idx on public.hosp_claim_history(register_id);

create or replace view public.hosp_claim_monthly_summary
with (security_invoker = true)
as
select
  workspace_year,
  workspace_month,
  coalesce(status, 'Unknown') as status,
  coalesce(plan, 'Unknown') as plan,
  coalesce(hospital, 'Unknown') as hospital,
  count(*) as claim_count,
  sum(total_claims_incurred) as total_claims_incurred,
  sum(finalised_paid_to_date) as finalised_paid_to_date,
  sum(claims_outstanding) as claims_outstanding,
  sum(actual_costs_invoices_received) as actual_costs_invoices_received,
  sum(member_costs) as member_costs
from public.hospital_claims_register
group by workspace_year, workspace_month, coalesce(status, 'Unknown'), coalesce(plan, 'Unknown'), coalesce(hospital, 'Unknown');

create or replace view public.hosp_claim_annual_summary
with (security_invoker = true)
as
select
  workspace_year,
  coalesce(status, 'Unknown') as status,
  coalesce(plan, 'Unknown') as plan,
  count(*) as claim_count,
  sum(total_claims_incurred) as total_claims_incurred,
  sum(finalised_paid_to_date) as finalised_paid_to_date,
  sum(claims_outstanding) as claims_outstanding,
  sum(actual_costs_invoices_received) as actual_costs_invoices_received,
  sum(member_costs) as member_costs
from public.hospital_claims_register
group by workspace_year, coalesce(status, 'Unknown'), coalesce(plan, 'Unknown');

alter table public.hospital_claim_intakes enable row level security;
alter table public.hospital_claims_register enable row level security;
alter table public.hosp_claims enable row level security;
alter table public.hosp_claim_documents enable row level security;
alter table public.hosp_claim_payments enable row level security;
alter table public.hosp_claim_audit enable row level security;
alter table public.hosp_claim_history enable row level security;
alter table public.hosp_claim_calculation_rules enable row level security;
