begin;

create table public.institution_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type = 'logo'),
  original_path text not null,
  normalized_path text,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now()
);

create table public.institution_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 200),
  logo_asset_id uuid references public.institution_assets(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.competency_observation_guides (
  id uuid primary key default gen_random_uuid(),
  age smallint not null check (age in (3, 4, 5)),
  competency_id uuid not null references public.competencies(id) on delete restrict,
  short_meaning text not null,
  suggested_contexts jsonb not null default '[]'::jsonb,
  observe_for jsonb not null default '[]'::jsonb,
  suggested_actions jsonb not null default '[]'::jsonb,
  caution_text text,
  official_performance_ids uuid[] not null default '{}',
  editorial_version integer not null default 1,
  reviewed_at timestamptz,
  is_active boolean not null default false,
  unique(age, competency_id, editorial_version)
);

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  template_type text not null,
  template_version integer not null,
  schema_version integer not null,
  file_path text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(template_type, template_version)
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  template_id uuid not null references public.document_templates(id) on delete restrict,
  logo_asset_id uuid references public.institution_assets(id) on delete set null,
  structured_payload jsonb not null,
  finalized_at timestamptz not null default now()
);

alter table public.institution_assets enable row level security;
alter table public.institution_profiles enable row level security;
alter table public.competency_observation_guides enable row level security;
alter table public.document_templates enable row level security;
alter table public.document_versions enable row level security;

create policy institution_assets_own_all on public.institution_assets for all
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy institution_profiles_own_all on public.institution_profiles for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid() and (logo_asset_id is null or exists (
    select 1 from public.institution_assets a where a.id = logo_asset_id and a.owner_user_id = auth.uid()
  )));
create policy observation_guides_read_authenticated on public.competency_observation_guides for select to authenticated
  using (is_active);
create policy document_templates_read_authenticated on public.document_templates for select to authenticated
  using (active);
create policy document_versions_own_all on public.document_versions for all
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

commit;
