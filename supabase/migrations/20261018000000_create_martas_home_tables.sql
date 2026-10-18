create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  hero_description text not null default 'Espaços com ideias grandes, feitos com o que já tens e o que podes gastar.'
    check (char_length(hero_description) between 1 and 180),
  contact_email text not null default 'ola@martashome.pt'
    check (contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (
    char_length(email) between 3 and 160
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  phone text not null default '' check (char_length(phone) <= 40),
  location text not null check (char_length(location) between 1 and 100),
  room text not null check (room in ('Sala', 'Quarto', 'Canto de trabalho', 'A casa toda')),
  mood text not null check (char_length(mood) between 1 and 80),
  budget text not null check (budget in ('Até 500€', '500€ — 1.500€', 'Quero conversar')),
  notes text not null default '' check (char_length(notes) <= 1200),
  status text not null default 'new' check (status in ('new', 'contacted', 'proposal', 'completed', 'archived')),
  internal_notes text not null default ''
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;

alter table public.site_settings enable row level security;
alter table public.leads enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated admins can update site settings" on public.site_settings;
create policy "Authenticated admins can update site settings"
  on public.site_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Public can submit leads" on public.leads;
create policy "Public can submit leads"
  on public.leads for insert
  to anon, authenticated
  with check (
    status = 'new'
    and internal_notes = ''
    and char_length(name) between 1 and 100
    and char_length(email) between 3 and 160
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and char_length(phone) <= 40
    and char_length(location) between 1 and 100
    and char_length(notes) <= 1200
  );

drop policy if exists "Authenticated admins can read leads" on public.leads;
create policy "Authenticated admins can read leads"
  on public.leads for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Authenticated admins can update leads" on public.leads;
create policy "Authenticated admins can update leads"
  on public.leads for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Authenticated admins can delete leads" on public.leads;
create policy "Authenticated admins can delete leads"
  on public.leads for delete
  to authenticated
  using ((select public.is_admin()));

insert into public.site_settings (id)
values (true)
on conflict (id) do nothing;

grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant insert (name, email, phone, location, room, mood, budget, notes)
  on public.leads to anon, authenticated;
grant select, update, delete on public.leads to authenticated;
grant execute on function public.is_admin() to authenticated;
