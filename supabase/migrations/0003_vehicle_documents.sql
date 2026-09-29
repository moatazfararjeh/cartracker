-- Car Tracker — vehicle documents (insurance card, vehicle license / Istimara)
-- One current document of each type per vehicle. Card photos live in `attachments`
-- (entity_type 'document'), and the expiry date drives a reminder.

do $$ begin
  create type public.vehicle_document_type as enum ('insurance', 'registration');
exception when duplicate_object then null; end $$;

create table if not exists public.vehicle_documents (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles(id) on delete cascade,
  doc_type    public.vehicle_document_type not null,
  number      text,            -- policy number / license serial number
  provider    text,            -- insurance company
  issue_date  date,
  expiry_date date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (vehicle_id, doc_type)
);

-- Allow card photos in attachments.
alter table public.attachments drop constraint if exists attachments_entity_type_check;
alter table public.attachments add constraint attachments_entity_type_check
  check (entity_type in ('fuel', 'maintenance', 'expense', 'vehicle', 'document'));

-- ---------------------------------------------------------------------
-- Expiry → date reminder (shares the insurance / registration reminder slot)
-- ---------------------------------------------------------------------
create or replace function public.vehicle_document_reminder()
returns trigger
language plpgsql
as $$
declare
  rec public.vehicle_documents%rowtype;
  cat public.expense_category;
begin
  if tg_op = 'DELETE' then
    rec := old;
  else
    rec := new;
  end if;
  cat := rec.doc_type::text::public.expense_category;

  if tg_op = 'DELETE' or rec.expiry_date is null then
    update public.reminders set is_active = false
     where vehicle_id = rec.vehicle_id and expense_category = cat;
    return rec;
  end if;

  insert into public.reminders (vehicle_id, expense_category, last_done_date, due_date, is_active)
  values (rec.vehicle_id, cat, rec.issue_date, rec.expiry_date, true)
  on conflict (vehicle_id, expense_category) where expense_category is not null
  do update set last_done_date = excluded.last_done_date,
                due_date       = excluded.due_date,
                is_active      = true;
  return rec;
end $$;

drop trigger if exists vehicle_document_reminder on public.vehicle_documents;
create trigger vehicle_document_reminder
  after insert or update of expiry_date, issue_date or delete on public.vehicle_documents
  for each row execute function public.vehicle_document_reminder();

-- ---------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------
alter table public.vehicle_documents enable row level security;

drop policy if exists vehicle_documents_owner on public.vehicle_documents;
create policy vehicle_documents_owner on public.vehicle_documents
  for all to authenticated
  using (public.owns_vehicle(vehicle_id))
  with check (public.owns_vehicle(vehicle_id));

grant select, insert, update, delete on public.vehicle_documents to authenticated;
revoke all on public.vehicle_documents from anon;
