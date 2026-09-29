import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';

import { vehicleKeys, type FuelType } from '@/features/vehicles/api';
import { supabase } from '@/lib/supabase';

export const EXPENSE_CATEGORIES = [
  'insurance',
  'registration',
  'inspection',
  'parking',
  'fine',
  'wash',
  'toll',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type RecordKind = 'maintenance' | 'fuel' | 'expense';

type LookupName = { name_en: string; name_ar: string | null };

export type PartCategory = LookupName & {
  id: string;
  code: string | null;
  icon: string | null;
};

/** One row of the combined history, newest first. */
export type ActivityItem =
  | {
      kind: 'fuel';
      id: string;
      date: string;
      odometer: number;
      amount: number;
      liters: number;
      station: string | null;
    }
  | {
      kind: 'maintenance';
      id: string;
      date: string;
      odometer: number;
      amount: number;
      parts: LookupName[];
      workshop: string | null;
    }
  | {
      kind: 'expense';
      id: string;
      date: string;
      odometer: number | null;
      amount: number;
      category: ExpenseCategory;
      notes: string | null;
    };

export type VehicleSummary = {
  cost_this_month: number;
  cost_this_year: number;
  avg_km_per_liter: number | null;
};

export type UpcomingItem = LookupName & {
  id: string;
  expense_category: ExpenseCategory | null;
  due_km: number | null;
  due_date: string | null;
  km_left: number | null;
  days_left: number | null;
  status: 'overdue' | 'soon' | 'ok';
};

export type YearInsights = {
  byKind: Record<RecordKind, number>;
  total: number;
  distanceKm: number;
};

/** Everything cached for one vehicle lives under this prefix, so a save refreshes it all. */
const vehicleData = (vehicleId: string | undefined) => ['vehicle-data', vehicleId] as const;

export const recordKeys = {
  activity: (vehicleId: string | undefined) => [...vehicleData(vehicleId), 'activity'] as const,
  summary: (vehicleId: string | undefined) => [...vehicleData(vehicleId), 'summary'] as const,
  upcoming: (vehicleId: string | undefined) => [...vehicleData(vehicleId), 'upcoming'] as const,
  insights: (vehicleId: string | undefined, year: number) =>
    [...vehicleData(vehicleId), 'insights', year] as const,
};

const ACTIVITY_LIMIT = 100;

export function useActivity(vehicleId: string | undefined) {
  return useQuery({
    queryKey: recordKeys.activity(vehicleId),
    enabled: !!vehicleId,
    queryFn: async (): Promise<ActivityItem[]> => {
      const [fuel, maintenance, expenses] = await Promise.all([
        supabase
          .from('fuel_entries')
          .select('id, filled_at, odometer, liters, total_cost, station')
          .eq('vehicle_id', vehicleId!)
          .order('filled_at', { ascending: false })
          .limit(ACTIVITY_LIMIT),
        supabase
          .from('maintenance_records')
          .select(
            'id, performed_at, odometer, total_cost, workshop, maintenance_items(part_categories(name_en, name_ar))'
          )
          .eq('vehicle_id', vehicleId!)
          .order('performed_at', { ascending: false })
          .limit(ACTIVITY_LIMIT),
        supabase
          .from('expenses')
          .select('id, category, spent_at, amount, odometer, notes')
          .eq('vehicle_id', vehicleId!)
          .order('spent_at', { ascending: false })
          .limit(ACTIVITY_LIMIT),
      ]);
      if (fuel.error) throw fuel.error;
      if (maintenance.error) throw maintenance.error;
      if (expenses.error) throw expenses.error;

      const items: ActivityItem[] = [
        ...fuel.data.map((f) => ({
          kind: 'fuel' as const,
          id: f.id,
          date: f.filled_at,
          odometer: f.odometer,
          amount: Number(f.total_cost),
          liters: Number(f.liters),
          station: f.station,
        })),
        ...maintenance.data.map((m) => ({
          kind: 'maintenance' as const,
          id: m.id,
          date: m.performed_at,
          odometer: m.odometer,
          amount: Number(m.total_cost),
          workshop: m.workshop,
          parts: (m.maintenance_items as unknown as { part_categories: LookupName | null }[])
            .map((i) => i.part_categories)
            .filter((p): p is LookupName => !!p),
        })),
        ...expenses.data.map((e) => ({
          kind: 'expense' as const,
          id: e.id,
          date: e.spent_at,
          odometer: e.odometer,
          amount: Number(e.amount),
          category: e.category as ExpenseCategory,
          notes: e.notes,
        })),
      ];

      return items
        .sort((a, b) => b.date.localeCompare(a.date) || (b.odometer ?? 0) - (a.odometer ?? 0))
        .slice(0, ACTIVITY_LIMIT);
    },
  });
}

export function useVehicleSummary(vehicleId: string | undefined) {
  return useQuery({
    queryKey: recordKeys.summary(vehicleId),
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_vehicle_summary')
        .select('cost_this_month, cost_this_year, avg_km_per_liter')
        .eq('vehicle_id', vehicleId!)
        .maybeSingle();
      if (error) throw error;
      return {
        cost_this_month: Number(data?.cost_this_month ?? 0),
        cost_this_year: Number(data?.cost_this_year ?? 0),
        avg_km_per_liter: data?.avg_km_per_liter == null ? null : Number(data.avg_km_per_liter),
      } satisfies VehicleSummary;
    },
  });
}

const STATUS_RANK = { overdue: 0, soon: 1, ok: 2 } as const;

/** Reminders for the vehicle, most urgent first. */
export function useUpcoming(vehicleId: string | undefined) {
  return useQuery({
    queryKey: recordKeys.upcoming(vehicleId),
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_upcoming_maintenance')
        .select('id, name_en, name_ar, expense_category, due_km, due_date, km_left, days_left, status')
        .eq('vehicle_id', vehicleId!);
      if (error) throw error;
      return (data as UpcomingItem[]).sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          (a.km_left ?? Infinity) - (b.km_left ?? Infinity) ||
          (a.days_left ?? Infinity) - (b.days_left ?? Infinity)
      );
    },
  });
}

export function useYearInsights(vehicleId: string | undefined, year: number) {
  return useQuery({
    queryKey: recordKeys.insights(vehicleId, year),
    enabled: !!vehicleId,
    queryFn: async (): Promise<YearInsights> => {
      const from = `${year}-01-01`;
      const to = `${year + 1}-01-01`;
      const [costs, readings] = await Promise.all([
        supabase
          .from('v_monthly_costs')
          .select('kind, amount')
          .eq('vehicle_id', vehicleId!)
          .gte('month', from)
          .lt('month', to),
        supabase
          .from('odometer_readings')
          .select('reading')
          .eq('vehicle_id', vehicleId!)
          .gte('read_at', from)
          .lt('read_at', to),
      ]);
      if (costs.error) throw costs.error;
      if (readings.error) throw readings.error;

      const byKind: Record<RecordKind, number> = { maintenance: 0, fuel: 0, expense: 0 };
      for (const row of costs.data) {
        byKind[row.kind as RecordKind] += Number(row.amount);
      }
      const values = readings.data.map((r) => r.reading as number);
      const distanceKm = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;

      return {
        byKind,
        total: byKind.maintenance + byKind.fuel + byKind.expense,
        distanceKm,
      };
    },
  });
}

export function usePartCategories() {
  return useQuery({
    queryKey: ['part-categories'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_categories')
        .select('id, code, name_en, name_ar, icon')
        .order('sort_order');
      if (error) throw error;
      return data as PartCategory[];
    },
  });
}

function refreshVehicle(queryClient: QueryClient, vehicleId: string) {
  // current_odometer changes with every record, so the vehicle list is refreshed too.
  queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
  queryClient.invalidateQueries({ queryKey: vehicleData(vehicleId) });
}

export type NewFuelEntry = {
  vehicle_id: string;
  filled_at: string;
  odometer: number;
  liters: number;
  total_cost: number;
  fuel_type: FuelType;
  station: string | null;
  is_full_tank: boolean;
  notes: string | null;
};

export function useCreateFuelEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: NewFuelEntry) => {
      const { error } = await supabase.from('fuel_entries').insert(entry);
      if (error) throw error;
    },
    onSuccess: (_data, entry) => refreshVehicle(queryClient, entry.vehicle_id),
  });
}

export type NewMaintenance = {
  vehicle_id: string;
  performed_at: string;
  odometer: number;
  workshop: string | null;
  notes: string | null;
  category_id: string;
  cost: number;
  next_due_km: number | null;
};

export function useCreateMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ category_id, cost, next_due_km, ...record }: NewMaintenance) => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .insert(record)
        .select('id')
        .single();
      if (error) throw error;

      const item = await supabase.from('maintenance_items').insert({
        record_id: data.id,
        vehicle_id: record.vehicle_id,
        category_id,
        quantity: 1,
        unit_cost: cost,
        next_due_km,
      });
      if (item.error) {
        // Don't leave an empty record behind.
        await supabase.from('maintenance_records').delete().eq('id', data.id);
        throw item.error;
      }
    },
    onSuccess: (_data, record) => refreshVehicle(queryClient, record.vehicle_id),
  });
}

export type NewExpense = {
  vehicle_id: string;
  category: ExpenseCategory;
  spent_at: string;
  amount: number;
  odometer: number | null;
  notes: string | null;
};

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: NewExpense) => {
      const { error } = await supabase.from('expenses').insert(expense);
      if (error) throw error;
    },
    onSuccess: (_data, expense) => refreshVehicle(queryClient, expense.vehicle_id),
  });
}

/** Turns database errors (e.g. odometer validation) into messages for the user. */
export function recordErrorMessage(error: Error, t: TFunction) {
  const match = /ODOMETER_TOO_(LOW|HIGH):(\d+)/.exec(error.message);
  if (match) {
    return match[1] === 'LOW'
      ? t('records.odometerTooLow', { value: match[2] })
      : t('records.odometerTooHigh', { value: match[2] });
  }
  return error.message || t('common.error');
}
