-- Car Tracker — keep part reminders correct when maintenance is edited or deleted.
-- Replaces the insert-only reminder trigger from 0001 with a recalculation from the
-- latest remaining replacement of each part.

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

  select rm.interval_km, rm.interval_months into i_km, i_mo
  from public.reminders rm where rm.vehicle_id = vid and rm.category_id = cid;

  select coalesce(i_km, c.default_interval_km), coalesce(i_mo, c.default_interval_months)
    into i_km, i_mo
  from public.part_categories c where c.id = cid;

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
    last_done_km   = excluded.last_done_km,
    last_done_date = excluded.last_done_date,
    due_km         = excluded.due_km,
    due_date       = excluded.due_date,
    is_active      = true;
end $$;

-- Items: insert / change of part or due values / delete.
create or replace function public.maintenance_item_reminder_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalc_part_reminder(old.vehicle_id, old.category_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE')
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id
          or new.vehicle_id is distinct from old.vehicle_id) then
    perform public.recalc_part_reminder(new.vehicle_id, new.category_id);
  end if;
  return null;
end $$;

drop trigger if exists maint_item_reminder on public.maintenance_items;
create trigger maint_item_reminder
  after insert or update of category_id, next_due_km, next_due_date or delete on public.maintenance_items
  for each row execute function public.maintenance_item_reminder_change();

-- Records: a changed date or odometer moves every part it contains.
create or replace function public.maintenance_record_reminder_change()
returns trigger
language plpgsql
as $$
declare
  cid uuid;
begin
  for cid in
    select distinct category_id from public.maintenance_items where record_id = new.id
  loop
    perform public.recalc_part_reminder(new.vehicle_id, cid);
  end loop;
  return null;
end $$;

drop trigger if exists maint_record_reminder on public.maintenance_records;
create trigger maint_record_reminder
  after update of performed_at, odometer on public.maintenance_records
  for each row execute function public.maintenance_record_reminder_change();

-- The old insert-only function is no longer used.
drop function if exists public.maintenance_item_upsert_reminder();
