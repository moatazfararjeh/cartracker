-- =====================================================================
-- Car Tracker — initial schema
-- Tables, triggers, views, RLS policies and storage buckets.
-- Run once in Supabase Studio → SQL Editor (then run seed.sql).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type public.fuel_type as enum ('gasoline_91', 'gasoline_95', 'gasoline_98', 'diesel', 'hybrid', 'electric', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.odometer_source as enum ('manual', 'vehicle', 'fuel', 'maintenance', 'expense', 'correction');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_category as enum ('insurance', 'registration', 'inspection', 'parking', 'fine', 'wash', 'toll', 'other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  phone              text,
  locale             text not null default 'ar',
  currency           text not null default 'SAR',
  default_vehicle_id uuid,
  created_at         timestamptz not null default now()
);

create table if not exists public.vehicles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  make             text not null,
  model            text not null,
  year             int check (year between 1900 and 2100),
  plate            text,
  vin              text,
  color            text,
  fuel_type        public.fuel_type not null default 'gasoline_91',
  tank_capacity    numeric(6,2),
  photo_path       text,
  purchase_date    date,
  purchase_price   numeric(12,2),
  initial_odometer int not null default 0 check (initial_odometer >= 0),
  current_odometer int not null default 0,
  archived_at      timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_default_vehicle_fk,
  add constraint profiles_default_vehicle_fk
    foreign key (default_vehicle_id) references public.vehicles(id) on delete set null;

create table if not exists public.odometer_readings (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references public.vehicles(id) on delete cascade,
  reading       int not null check (reading >= 0),
  read_at       date not null default current_date,
  source        public.odometer_source not null default 'manual',
  source_id     uuid,
  is_correction boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.fuel_entries (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles(id) on delete cascade,
  filled_at       date not null default current_date,
  odometer        int not null check (odometer >= 0),
  liters          numeric(8,2) not null check (liters > 0),
  total_cost      numeric(10,2) not null check (total_cost >= 0),
  price_per_liter numeric(8,3) generated always as (round(total_cost / nullif(liters, 0), 3)) stored,
  fuel_type       public.fuel_type,
  station         text,
  is_full_tank    boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.part_categories (
  id                      uuid primary key default gen_random_uuid(),
  code                    text,
  name_ar                 text not null,
  name_en                 text not null,
  icon                    text,
  default_interval_km     int,
  default_interval_months int,
  sort_order              int not null default 100,
  user_id                 uuid references auth.users(id) on delete cascade, -- null = system catalog
  created_at              timestamptz not null default now()
);
create unique index if not exists part_categories_code_uq on public.part_categories(code) where user_id is null;

create table if not exists public.maintenance_records (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  performed_at date not null default current_date,
  odometer     int not null check (odometer >= 0),
  workshop     text,
  labor_cost   numeric(10,2) not null default 0 check (labor_cost >= 0),
  total_cost   numeric(10,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.maintenance_items (
  id            uuid primary key default gen_random_uuid(),
  record_id     uuid not null references public.maintenance_records(id) on delete cascade,
  vehicle_id    uuid not null references public.vehicles(id) on delete cascade,
  category_id   uuid not null references public.part_categories(id),
  brand         text,
  spec          text,
  quantity      numeric(8,2) not null default 1 check (quantity > 0),
  unit_cost     numeric(10,2) not null default 0 check (unit_cost >= 0),
  total_cost    numeric(10,2) generated always as (round(quantity * unit_cost, 2)) stored,
  next_due_km   int,
  next_due_date date,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  category   public.expense_category not null,
  spent_at   date not null default current_date,
  amount     numeric(10,2) not null check (amount >= 0),
  odometer   int check (odometer >= 0),
  valid_until date,            -- e.g. insurance / registration expiry
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles(id) on delete cascade,
  category_id     uuid references public.part_categories(id) on delete cascade,
  expense_category public.expense_category,
  title           text,
  interval_km     int,
  interval_months int,
  last_done_km    int,
  last_done_date  date,
  due_km          int,
  due_date        date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create unique index if not exists reminders_vehicle_category_uq
  on public.reminders(vehicle_id, category_id) where category_id is not null;
create unique index if not exists reminders_vehicle_expense_uq
  on public.reminders(vehicle_id, expense_category) where expense_category is not null;

create table if not exists public.attachments (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references public.vehicles(id) on delete cascade,
  entity_type  text not null check (entity_type in ('fuel', 'maintenance', 'expense', 'vehicle')),
  entity_id    uuid not null,
  storage_path text not null,
  mime_type    text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
create index if not exists vehicles_user_idx           on public.vehicles(user_id);
create index if not exists odometer_vehicle_idx        on public.odometer_readings(vehicle_id, read_at desc, reading desc);
create unique index if not exists odometer_source_uq   on public.odometer_readings(source, source_id) where source_id is not null;
create index if not exists fuel_vehicle_idx            on public.fuel_entries(vehicle_id, filled_at desc, odometer desc);
create index if not exists maint_vehicle_idx           on public.maintenance_records(vehicle_id, performed_at desc);
create index if not exists maint_items_record_idx      on public.maintenance_items(record_id);
create index if not exists maint_items_vehicle_cat_idx on public.maintenance_items(vehicle_id, category_id);
create index if not exists expenses_vehicle_idx        on public.expenses(vehicle_id, spent_at desc);
create index if not exists attachments_entity_idx      on public.attachments(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Helper: ownership check used by RLS
-- ---------------------------------------------------------------------
create or replace function public.owns_vehicle(vid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.vehicles v where v.id = vid and v.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Profile auto-creation on signup
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Odometer logic
-- ---------------------------------------------------------------------

-- Validate a reading is consistent with the vehicle's timeline, unless it is a correction.
create or replace function public.validate_odometer_reading()
returns trigger
language plpgsql
as $$
declare
  corr     public.odometer_readings%rowtype;
  prev_max int;
  next_min int;
begin
  if new.is_correction then
    return new;
  end if;

  -- A correction resets the baseline: readings before it are ignored.
  select * into corr
  from public.odometer_readings
  where vehicle_id = new.vehicle_id and is_correction and read_at <= new.read_at and id <> new.id
  order by read_at desc, created_at desc
  limit 1;

  select max(reading) into prev_max
  from public.odometer_readings r
  where r.vehicle_id = new.vehicle_id
    and r.read_at <= new.read_at
    and r.id <> new.id
    and not (r.source_id is not null and r.source_id = new.source_id and r.source = new.source)
    and (corr.id is null or r.read_at > corr.read_at or (r.read_at = corr.read_at and r.created_at >= corr.created_at));

  select min(reading) into next_min
  from public.odometer_readings r
  where r.vehicle_id = new.vehicle_id
    and r.read_at > new.read_at
    and r.id <> new.id
    and not r.is_correction
    and not (r.source_id is not null and r.source_id = new.source_id and r.source = new.source);

  if prev_max is not null and new.reading < prev_max then
    raise exception 'ODOMETER_TOO_LOW:%', prev_max
      using errcode = 'P0001', detail = format('reading %s is lower than previous reading %s', new.reading, prev_max);
  end if;

  if next_min is not null and new.reading > next_min then
    raise exception 'ODOMETER_TOO_HIGH:%', next_min
      using errcode = 'P0001', detail = format('reading %s is higher than a later reading %s', new.reading, next_min);
  end if;

  return new;
end $$;

drop trigger if exists odometer_validate on public.odometer_readings;
create trigger odometer_validate
  before insert or update on public.odometer_readings
  for each row execute function public.validate_odometer_reading();

-- Keep vehicles.current_odometer = latest reading.
create or replace function public.refresh_vehicle_odometer(vid uuid)
returns void
language sql
as $$
  update public.vehicles v
  set current_odometer = coalesce(
    (select r.reading from public.odometer_readings r
      where r.vehicle_id = vid
      order by r.read_at desc, r.created_at desc
      limit 1),
    v.initial_odometer)
  where v.id = vid;
$$;

create or replace function public.after_odometer_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_vehicle_odometer(old.vehicle_id);
    return old;
  end if;
  perform public.refresh_vehicle_odometer(new.vehicle_id);
  return new;
end $$;

drop trigger if exists odometer_after_change on public.odometer_readings;
create trigger odometer_after_change
  after insert or update or delete on public.odometer_readings
  for each row execute function public.after_odometer_change();

-- Initial reading when a vehicle is created; kept in sync when edited.
create or replace function public.vehicle_initial_reading()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    update public.odometer_readings
       set reading = new.initial_odometer, read_at = coalesce(new.purchase_date, read_at)
     where source = 'vehicle' and source_id = new.id;
    return new;
  end if;
  insert into public.odometer_readings (vehicle_id, reading, read_at, source, source_id)
  values (new.id, new.initial_odometer, coalesce(new.purchase_date, current_date), 'vehicle', new.id);
  return new;
end $$;

drop trigger if exists vehicle_after_insert on public.vehicles;
create trigger vehicle_after_insert
  after insert or update of initial_odometer, purchase_date on public.vehicles
  for each row execute function public.vehicle_initial_reading();

-- Generic sync from fuel / maintenance / expense rows into odometer_readings.
-- TG_ARGV[0] = source, TG_ARGV[1] = date column name.
create or replace function public.sync_odometer_from_entry()
returns trigger
language plpgsql
as $$
declare
  src public.odometer_source := tg_argv[0]::public.odometer_source;
  d   date;
begin
  if tg_op = 'DELETE' then
    delete from public.odometer_readings where source = src and source_id = old.id;
    return old;
  end if;

  d := (to_jsonb(new) ->> tg_argv[1])::date;

  if new.odometer is null then
    delete from public.odometer_readings where source = src and source_id = new.id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    update public.odometer_readings
       set reading = new.odometer, read_at = d
     where source = src and source_id = new.id;
    if found then
      return new;
    end if;
  end if;

  insert into public.odometer_readings (vehicle_id, reading, read_at, source, source_id)
  values (new.vehicle_id, new.odometer, d, src, new.id);
  return new;
end $$;

drop trigger if exists fuel_sync_odometer on public.fuel_entries;
create trigger fuel_sync_odometer
  after insert or update of odometer, filled_at or delete on public.fuel_entries
  for each row execute function public.sync_odometer_from_entry('fuel', 'filled_at');

drop trigger if exists maint_sync_odometer on public.maintenance_records;
create trigger maint_sync_odometer
  after insert or update of odometer, performed_at or delete on public.maintenance_records
  for each row execute function public.sync_odometer_from_entry('maintenance', 'performed_at');

drop trigger if exists expense_sync_odometer on public.expenses;
create trigger expense_sync_odometer
  after insert or update of odometer, spent_at or delete on public.expenses
  for each row execute function public.sync_odometer_from_entry('expense', 'spent_at');

-- ---------------------------------------------------------------------
-- Maintenance totals + reminders
-- ---------------------------------------------------------------------
create or replace function public.recalc_maintenance_total(rid uuid)
returns void
language sql
as $$
  update public.maintenance_records r
  set total_cost = r.labor_cost + coalesce((select sum(i.total_cost) from public.maintenance_items i where i.record_id = rid), 0)
  where r.id = rid;
$$;

create or replace function public.maintenance_items_after_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_maintenance_total(old.record_id);
    return old;
  end if;
  perform public.recalc_maintenance_total(new.record_id);
  return new;
end $$;

drop trigger if exists maint_items_total on public.maintenance_items;
create trigger maint_items_total
  after insert or update or delete on public.maintenance_items
  for each row execute function public.maintenance_items_after_change();

create or replace function public.maintenance_labor_changed()
returns trigger
language plpgsql
as $$
begin
  perform public.recalc_maintenance_total(new.id);
  return new;
end $$;

drop trigger if exists maint_labor_total on public.maintenance_records;
create trigger maint_labor_total
  after update of labor_cost on public.maintenance_records
  for each row execute function public.maintenance_labor_changed();

-- Item vehicle_id must match its record.
create or replace function public.maintenance_item_set_vehicle()
returns trigger
language plpgsql
as $$
begin
  select vehicle_id into new.vehicle_id from public.maintenance_records where id = new.record_id;
  return new;
end $$;

drop trigger if exists maint_item_vehicle on public.maintenance_items;
create trigger maint_item_vehicle
  before insert or update of record_id on public.maintenance_items
  for each row execute function public.maintenance_item_set_vehicle();

-- When a part is replaced, (re)schedule its reminder — only if this is the latest replacement.
create or replace function public.maintenance_item_upsert_reminder()
returns trigger
language plpgsql
as $$
declare
  rec     public.maintenance_records%rowtype;
  cat     public.part_categories%rowtype;
  i_km    int;
  i_mo    int;
  latest  date;
begin
  select * into rec from public.maintenance_records where id = new.record_id;
  select * into cat from public.part_categories where id = new.category_id;

  select max(r.performed_at) into latest
  from public.maintenance_items i join public.maintenance_records r on r.id = i.record_id
  where i.vehicle_id = new.vehicle_id and i.category_id = new.category_id;

  if rec.performed_at < latest then
    return new;
  end if;

  select interval_km, interval_months into i_km, i_mo
  from public.reminders where vehicle_id = new.vehicle_id and category_id = new.category_id;
  i_km := coalesce(i_km, cat.default_interval_km);
  i_mo := coalesce(i_mo, cat.default_interval_months);

  if new.next_due_km is null and new.next_due_date is null and i_km is null and i_mo is null then
    return new;
  end if;

  insert into public.reminders as rm
    (vehicle_id, category_id, interval_km, interval_months, last_done_km, last_done_date, due_km, due_date, is_active)
  values (
    new.vehicle_id, new.category_id, i_km, i_mo, rec.odometer, rec.performed_at,
    coalesce(new.next_due_km, rec.odometer + i_km),
    coalesce(new.next_due_date, (rec.performed_at + make_interval(months => i_mo))::date),
    true)
  on conflict (vehicle_id, category_id) where category_id is not null
  do update set
    last_done_km   = excluded.last_done_km,
    last_done_date = excluded.last_done_date,
    due_km         = excluded.due_km,
    due_date       = excluded.due_date,
    is_active      = true;

  return new;
end $$;

drop trigger if exists maint_item_reminder on public.maintenance_items;
create trigger maint_item_reminder
  after insert on public.maintenance_items
  for each row execute function public.maintenance_item_upsert_reminder();

-- Insurance / registration expiry → date-based reminder.
create or replace function public.expense_upsert_reminder()
returns trigger
language plpgsql
as $$
begin
  if new.valid_until is null or new.category not in ('insurance', 'registration', 'inspection') then
    return new;
  end if;

  insert into public.reminders as rm (vehicle_id, expense_category, last_done_date, due_date, is_active)
  values (new.vehicle_id, new.category, new.spent_at, new.valid_until, true)
  on conflict (vehicle_id, expense_category) where expense_category is not null
  do update set last_done_date = excluded.last_done_date, due_date = excluded.due_date, is_active = true
  where rm.due_date is null or excluded.due_date >= rm.due_date;

  return new;
end $$;

drop trigger if exists expense_reminder on public.expenses;
create trigger expense_reminder
  after insert or update of valid_until on public.expenses
  for each row execute function public.expense_upsert_reminder();

-- ---------------------------------------------------------------------
-- Views (security_invoker so RLS of the caller applies)
-- ---------------------------------------------------------------------

-- Fuel: distance since previous fill, and consumption between full-tank fills.
create or replace view public.v_fuel_stats with (security_invoker = true) as
with ordered as (
  select f.*,
         lag(f.odometer) over w as prev_odometer,
         -- liters added since the previous full fill (partial fills accumulate)
         sum(f.liters) over (partition by f.vehicle_id, f.full_group order by f.filled_at, f.odometer
                             rows between unbounded preceding and current row) as liters_since_full
  from (
    select fe.*,
           count(*) filter (where fe.is_full_tank) over (partition by fe.vehicle_id order by fe.filled_at, fe.odometer
                                                        rows between unbounded preceding and 1 preceding) as full_group
    from public.fuel_entries fe
  ) f
  window w as (partition by f.vehicle_id order by f.filled_at, f.odometer)
),
with_prev_full as (
  select o.*,
         (select max(p.odometer) from public.fuel_entries p
           where p.vehicle_id = o.vehicle_id and p.is_full_tank
             and (p.filled_at, p.odometer) < (o.filled_at, o.odometer)) as prev_full_odometer
  from ordered o
)
select
  id, vehicle_id, filled_at, odometer, liters, total_cost, price_per_liter, station, is_full_tank, notes, fuel_type,
  prev_odometer,
  case when prev_odometer is not null then odometer - prev_odometer end as distance_km,
  case when is_full_tank and prev_full_odometer is not null and liters_since_full > 0
       then round((odometer - prev_full_odometer)::numeric / liters_since_full, 2) end as km_per_liter,
  case when is_full_tank and prev_full_odometer is not null and odometer > prev_full_odometer
       then round(liters_since_full * 100 / (odometer - prev_full_odometer)::numeric, 2) end as liters_per_100km
from with_prev_full;

-- All costs in one stream.
create or replace view public.v_all_costs with (security_invoker = true) as
  select vehicle_id, filled_at as spent_on, 'fuel'::text as kind, null::text as sub_kind, total_cost as amount, id as source_id
  from public.fuel_entries
union all
  select vehicle_id, performed_at, 'maintenance', null, total_cost, id
  from public.maintenance_records
union all
  select vehicle_id, spent_at, 'expense', category::text, amount, id
  from public.expenses;

create or replace view public.v_monthly_costs with (security_invoker = true) as
select vehicle_id,
       date_trunc('month', spent_on)::date as month,
       kind,
       sum(amount)::numeric(12,2) as amount
from public.v_all_costs
group by 1, 2, 3;

-- Part history: replacement count, total cost, average life in km.
create or replace view public.v_part_history with (security_invoker = true) as
with repl as (
  select i.vehicle_id, i.category_id, r.performed_at, r.odometer, i.total_cost,
         lag(r.odometer) over (partition by i.vehicle_id, i.category_id order by r.performed_at, r.odometer) as prev_km
  from public.maintenance_items i
  join public.maintenance_records r on r.id = i.record_id
),
agg as (
  select vehicle_id, category_id,
         count(*)                      as times_replaced,
         sum(total_cost)::numeric(12,2) as total_cost,
         max(performed_at)             as last_date,
         max(odometer)                 as last_odometer,
         round(avg(odometer - prev_km)) as avg_life_km,
         count(*) filter (where performed_at >= date_trunc('year', current_date)) as times_this_year,
         count(*) filter (where performed_at >= current_date - interval '12 months') as times_last_12m
  from repl
  group by vehicle_id, category_id
)
select a.*,
       c.name_ar, c.name_en, c.icon, c.code,
       v.current_odometer - a.last_odometer as km_since_last
from agg a
join public.part_categories c on c.id = a.category_id
join public.vehicles v on v.id = a.vehicle_id;

-- Upcoming maintenance: km/days left + status (whichever comes first).
create or replace view public.v_upcoming_maintenance with (security_invoker = true) as
select rm.id, rm.vehicle_id, rm.category_id, rm.expense_category, rm.title,
       coalesce(c.name_ar, rm.title) as name_ar,
       coalesce(c.name_en, rm.title) as name_en,
       c.icon,
       rm.due_km, rm.due_date, rm.last_done_km, rm.last_done_date, rm.interval_km, rm.interval_months,
       v.current_odometer,
       rm.due_km - v.current_odometer as km_left,
       rm.due_date - current_date     as days_left,
       case
         when (rm.due_km is not null and rm.due_km - v.current_odometer < 0)
           or (rm.due_date is not null and rm.due_date < current_date) then 'overdue'
         when (rm.due_km is not null and rm.due_km - v.current_odometer <= 1000)
           or (rm.due_date is not null and rm.due_date - current_date <= 30) then 'soon'
         else 'ok'
       end as status
from public.reminders rm
join public.vehicles v on v.id = rm.vehicle_id
left join public.part_categories c on c.id = rm.category_id
where rm.is_active and v.archived_at is null;

-- Per-vehicle summary for the dashboard.
create or replace view public.v_vehicle_summary with (security_invoker = true) as
select v.id as vehicle_id,
       v.user_id,
       v.current_odometer,
       v.initial_odometer,
       coalesce(sum(c.amount) filter (where c.spent_on >= date_trunc('month', current_date)), 0)::numeric(12,2) as cost_this_month,
       coalesce(sum(c.amount) filter (where c.spent_on >= date_trunc('month', current_date) and c.kind = 'fuel'), 0)::numeric(12,2) as fuel_this_month,
       coalesce(sum(c.amount) filter (where c.spent_on >= date_trunc('year', current_date)), 0)::numeric(12,2) as cost_this_year,
       coalesce(sum(c.amount) filter (where c.spent_on >= current_date - interval '12 months'), 0)::numeric(12,2) as cost_last_12m,
       coalesce(sum(c.amount) filter (where c.spent_on >= current_date - interval '12 months' and c.kind = 'fuel'), 0)::numeric(12,2) as fuel_last_12m,
       coalesce(sum(c.amount), 0)::numeric(12,2) as cost_total,
       (select max(r.reading) - min(r.reading) from public.odometer_readings r
         where r.vehicle_id = v.id and r.read_at >= current_date - interval '12 months') as km_last_12m,
       case when v.current_odometer > v.initial_odometer
            then round(coalesce(sum(c.amount), 0) / (v.current_odometer - v.initial_odometer), 3) end as cost_per_km,
       (select round(avg(f.km_per_liter), 2) from public.v_fuel_stats f
         where f.vehicle_id = v.id and f.km_per_liter is not null
           and f.filled_at >= current_date - interval '12 months') as avg_km_per_liter
from public.vehicles v
left join public.v_all_costs c on c.vehicle_id = v.id
group by v.id;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.vehicles            enable row level security;
alter table public.odometer_readings   enable row level security;
alter table public.fuel_entries        enable row level security;
alter table public.part_categories     enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.maintenance_items   enable row level security;
alter table public.expenses            enable row level security;
alter table public.reminders           enable row level security;
alter table public.attachments         enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (default_vehicle_id is null or public.owns_vehicle(default_vehicle_id)));

drop policy if exists vehicles_owner on public.vehicles;
create policy vehicles_owner on public.vehicles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Same policy shape for every vehicle-scoped table.
do $$
declare t text;
begin
  foreach t in array array['odometer_readings', 'fuel_entries', 'maintenance_records', 'maintenance_items',
                           'expenses', 'reminders', 'attachments']
  loop
    execute format('drop policy if exists %1$s_owner on public.%1$s', t);
    execute format(
      'create policy %1$s_owner on public.%1$s for all to authenticated
         using (public.owns_vehicle(vehicle_id)) with check (public.owns_vehicle(vehicle_id))', t);
  end loop;
end $$;

drop policy if exists part_categories_read on public.part_categories;
create policy part_categories_read on public.part_categories
  for select to authenticated
  using (user_id is null or user_id = auth.uid());

drop policy if exists part_categories_write on public.part_categories;
create policy part_categories_write on public.part_categories
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Internal functions are not exposed over RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.owns_vehicle(uuid) from public, anon;

-- Custom categories: default user_id to caller.
alter table public.part_categories alter column user_id set default auth.uid();

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.v_fuel_stats, public.v_all_costs, public.v_monthly_costs,
                public.v_part_history, public.v_upcoming_maintenance, public.v_vehicle_summary to authenticated;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- Storage: private buckets, files stored under "<user_id>/..."
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', false), ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "car tracker own files select" on storage.objects;
create policy "car tracker own files select" on storage.objects
  for select to authenticated
  using (bucket_id in ('vehicle-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "car tracker own files insert" on storage.objects;
create policy "car tracker own files insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('vehicle-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "car tracker own files update" on storage.objects;
create policy "car tracker own files update" on storage.objects
  for update to authenticated
  using (bucket_id in ('vehicle-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "car tracker own files delete" on storage.objects;
create policy "car tracker own files delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('vehicle-photos', 'receipts') and (storage.foldername(name))[1] = auth.uid()::text);
