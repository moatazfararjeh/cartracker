-- Car Care — personal service intervals.
-- part_categories holds the system defaults (e.g. engine oil every 10,000 km / 6 months).
-- Each user can override a part's interval for all their vehicles; a row here replaces
-- both default values (null = no reminder by km / by date). Deleting the row restores
-- the defaults.

create table if not exists public.user_part_intervals (
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id     uuid not null references public.part_categories(id) on delete cascade,
  interval_km     int check (interval_km is null or interval_km > 0),
  interval_months int check (interval_months is null or interval_months > 0),
  updated_at      timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.user_part_intervals enable row level security;

drop policy if exists user_part_intervals_owner on public.user_part_intervals;
create policy user_part_intervals_owner on public.user_part_intervals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_part_intervals to authenticated;
revoke all on public.user_part_intervals from anon;

-- Interval used for a vehicle's part: the owner's override, else the system default.
create or replace function public.part_interval(vid uuid, cid uuid, out i_km int, out i_mo int)
language sql
stable
as $$
  select
    case when o.category_id is not null then o.interval_km else c.default_interval_km end,
    case when o.category_id is not null then o.interval_months else c.default_interval_months end
  from public.part_categories c
  left join public.vehicles v on v.id = vid
  left join public.user_part_intervals o on o.user_id = v.user_id and o.category_id = c.id
  where c.id = cid
$$;

-- Same as 0004, but the interval now comes from part_interval() and is written to the
-- reminder every time (reminders.interval_* only ever held a copy of the default).
create or replace function public.recalc_part_reminder(vid uuid, cid uuid)
returns void
language plpgsql
as $$
declare
  latest_km      int;
  latest_date    date;
  due_km_manual  int;
  due_dt_manual  date;
  i_km           int;
  i_mo           int;
begin
  select r.odometer, r.performed_at, i.next_due_km, i.next_due_date
    into latest_km, latest_date, due_km_manual, due_dt_manual
  from public.maintenance_items i
  join public.maintenance_records r on r.id = i.record_id
  where i.vehicle_id = vid and i.category_id = cid
  order by r.performed_at desc, r.odometer desc, i.created_at desc
  limit 1;

  if not found then
    -- Last replacement of this part was deleted.
    update public.reminders set is_active = false
     where vehicle_id = vid and category_id = cid;
    return;
  end if;

  select p.i_km, p.i_mo into i_km, i_mo from public.part_interval(vid, cid) p;

  if due_km_manual is null and due_dt_manual is null and i_km is null and i_mo is null then
    update public.reminders set is_active = false
     where vehicle_id = vid and category_id = cid;
    return;
  end if;

  insert into public.reminders as rm
    (vehicle_id, category_id, interval_km, interval_months, last_done_km, last_done_date, due_km, due_date, is_active)
  values (
    vid, cid, i_km, i_mo, latest_km, latest_date,
    coalesce(due_km_manual, latest_km + i_km),
    coalesce(due_dt_manual, (latest_date + make_interval(months => i_mo))::date),
    true)
  on conflict (vehicle_id, category_id) where category_id is not null
  do update set
    interval_km     = excluded.interval_km,
    interval_months = excluded.interval_months,
    last_done_km    = excluded.last_done_km,
    last_done_date  = excluded.last_done_date,
    due_km          = excluded.due_km,
    due_date        = excluded.due_date,
    is_active       = true;
end $$;

-- Changing or resetting an interval reschedules that part on all the user's vehicles.
create or replace function public.user_part_interval_change()
returns trigger
language plpgsql
as $$
declare
  vid uuid;
  uid uuid := coalesce(new.user_id, old.user_id);
  cid uuid := coalesce(new.category_id, old.category_id);
begin
  for vid in select v.id from public.vehicles v where v.user_id = uid loop
    perform public.recalc_part_reminder(vid, cid);
  end loop;
  return null;
end $$;

drop trigger if exists user_part_interval_reminders on public.user_part_intervals;
create trigger user_part_interval_reminders
  after insert or update or delete on public.user_part_intervals
  for each row execute function public.user_part_interval_change();
