-- Car Care — in-app account deletion (App Store guideline 5.1.1(v)).
-- Deletes the calling user. Foreign keys cascade to the profile, vehicles, every record,
-- documents, reminders, attachments rows and custom part categories.
-- Stored files are removed by the app through the Storage API before this is called,
-- because Supabase Storage objects must not be deleted with SQL.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  delete from auth.users where id = uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
