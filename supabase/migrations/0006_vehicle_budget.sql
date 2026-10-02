-- Car Care — optional monthly budget per vehicle (in the user's currency).
-- Home compares it with the month's spending (v_vehicle_summary.cost_this_month).

alter table public.vehicles
  add column if not exists monthly_budget numeric(10,2) check (monthly_budget is null or monthly_budget > 0);
