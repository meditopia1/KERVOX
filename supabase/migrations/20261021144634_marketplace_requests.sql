-- Public marketplace submissions are written only by the server-side API.
create table if not exists public.marketplace_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('buy', 'sell')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  company text check (company is null or char_length(company) <= 120),
  product_name text not null check (char_length(product_name) between 2 and 160),
  category text not null check (char_length(category) between 2 and 120),
  item_condition text not null check (item_condition in ('new', 'refurbished', 'used')),
  quantity integer not null check (quantity between 1 and 99),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists marketplace_requests_status_created_idx
  on public.marketplace_requests (status, created_at desc);

alter table public.marketplace_requests enable row level security;
revoke all on public.marketplace_requests from anon, authenticated;
grant all on public.marketplace_requests to service_role;
