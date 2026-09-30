import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';

import {
  AttachmentUploadError,
  deleteAttachment,
  listAttachments,
  uploadAttachments,
  type PendingAttachment,
  type StoredAttachment,
} from '@/features/records/attachments';
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

/** Hides a reminder until the part is serviced again or the document is renewed. */
export function useDismissReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; vehicleId: string }) => {
      const { error } = await supabase.from('reminders').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { vehicleId }) =>
      queryClient.invalidateQueries({ queryKey: recordKeys.upcoming(vehicleId) }),
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

/** Form values shared by all record kinds; fields not used by a kind are null. */
export type RecordValues = {
  kind: RecordKind;
  vehicle_id: string;
  date: string;
  odometer: number | null;
  amount: number;
  /** Workshop (maintenance) or station (fuel). */
  place: string | null;
  notes: string | null;
  category_id: string | null;
  next_due_km: number | null;
  liters: number | null;
  fuel_type: FuelType | null;
  is_full_tank: boolean;
  expense_category: ExpenseCategory | null;
};

/** A saved record loaded for editing. */
export type LoadedRecord = RecordValues & {
  id: string;
  /** The maintenance item edited by the form (records created in the app have one). */
  item_id: string | null;
};

const ENTITY_TABLE: Record<RecordKind, string> = {
  fuel: 'fuel_entries',
  maintenance: 'maintenance_records',
  expense: 'expenses',
};

export function useRecord(kind: RecordKind, id: string | undefined) {
  return useQuery({
    queryKey: ['record', kind, id],
    enabled: !!id,
    queryFn: async (): Promise<LoadedRecord> => {
      const base = { kind, id: id!, item_id: null, category_id: null, next_due_km: null, liters: null,
        fuel_type: null, is_full_tank: true, expense_category: null, place: null } as const;

      if (kind === 'fuel') {
        const { data, error } = await supabase
          .from('fuel_entries')
          .select('vehicle_id, filled_at, odometer, liters, total_cost, fuel_type, station, is_full_tank, notes')
          .eq('id', id!)
          .single();
        if (error) throw error;
        return {
          ...base,
          vehicle_id: data.vehicle_id,
          date: data.filled_at,
          odometer: data.odometer,
          amount: Number(data.total_cost),
          liters: Number(data.liters),
          fuel_type: data.fuel_type as FuelType | null,
          is_full_tank: data.is_full_tank,
          place: data.station,
          notes: data.notes,
        };
      }

      if (kind === 'maintenance') {
        const { data, error } = await supabase
          .from('maintenance_records')
          .select(
            'vehicle_id, performed_at, odometer, workshop, total_cost, notes, maintenance_items(id, category_id, next_due_km, created_at)'
          )
          .eq('id', id!)
          .single();
        if (error) throw error;
        const items = (data.maintenance_items as {
          id: string;
          category_id: string;
          next_due_km: number | null;
          created_at: string;
        }[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
        const item = items[0];
        return {
          ...base,
          vehicle_id: data.vehicle_id,
          date: data.performed_at,
          odometer: data.odometer,
          amount: Number(data.total_cost),
          place: data.workshop,
          notes: data.notes,
          item_id: item?.id ?? null,
          category_id: item?.category_id ?? null,
          next_due_km: item?.next_due_km ?? null,
        };
      }

      const { data, error } = await supabase
        .from('expenses')
        .select('vehicle_id, category, spent_at, amount, odometer, notes')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return {
        ...base,
        vehicle_id: data.vehicle_id,
        date: data.spent_at,
        odometer: data.odometer,
        amount: Number(data.amount),
        notes: data.notes,
        expense_category: data.category as ExpenseCategory,
      };
    },
  });
}

export type SaveRecordInput = {
  /** Present when editing an existing record. */
  id?: string;
  item_id?: string | null;
  values: RecordValues;
  newFiles: PendingAttachment[];
  removedFiles: StoredAttachment[];
};

async function saveFuel(values: RecordValues, id?: string) {
  const row = {
    vehicle_id: values.vehicle_id,
    filled_at: values.date,
    odometer: values.odometer!,
    liters: values.liters!,
    total_cost: values.amount,
    fuel_type: values.fuel_type,
    station: values.place,
    is_full_tank: values.is_full_tank,
    notes: values.notes,
  };
  const query = id
    ? supabase.from('fuel_entries').update(row).eq('id', id)
    : supabase.from('fuel_entries').insert(row);
  const { data, error } = await query.select('id').single();
  if (error) throw error;
  return data.id as string;
}

async function saveMaintenance(values: RecordValues, id?: string, itemId?: string | null) {
  const record = {
    vehicle_id: values.vehicle_id,
    performed_at: values.date,
    odometer: values.odometer!,
    workshop: values.place,
    notes: values.notes,
  };
  const item = {
    category_id: values.category_id!,
    quantity: 1,
    unit_cost: values.amount,
    next_due_km: values.next_due_km,
  };

  if (id) {
    const updated = await supabase.from('maintenance_records').update(record).eq('id', id);
    if (updated.error) throw updated.error;
    const itemResult = itemId
      ? await supabase.from('maintenance_items').update(item).eq('id', itemId)
      : await supabase
          .from('maintenance_items')
          .insert({ ...item, record_id: id, vehicle_id: values.vehicle_id });
    if (itemResult.error) throw itemResult.error;
    return id;
  }

  const { data, error } = await supabase.from('maintenance_records').insert(record).select('id').single();
  if (error) throw error;
  const inserted = await supabase
    .from('maintenance_items')
    .insert({ ...item, record_id: data.id, vehicle_id: values.vehicle_id });
  if (inserted.error) {
    // Don't leave an empty record behind.
    await supabase.from('maintenance_records').delete().eq('id', data.id);
    throw inserted.error;
  }
  return data.id as string;
}

async function saveExpense(values: RecordValues, id?: string) {
  const row = {
    vehicle_id: values.vehicle_id,
    category: values.expense_category!,
    spent_at: values.date,
    amount: values.amount,
    odometer: values.odometer,
    notes: values.notes,
  };
  const query = id
    ? supabase.from('expenses').update(row).eq('id', id)
    : supabase.from('expenses').insert(row);
  const { data, error } = await query.select('id').single();
  if (error) throw error;
  return data.id as string;
}

/** Creates or updates a record of any kind, then applies attachment changes. */
export function useSaveRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, item_id, values, newFiles, removedFiles }: SaveRecordInput) => {
      const savedId =
        values.kind === 'fuel'
          ? await saveFuel(values, id)
          : values.kind === 'maintenance'
            ? await saveMaintenance(values, id, item_id)
            : await saveExpense(values, id);

      try {
        for (const file of removedFiles) await deleteAttachment(file);
      } catch (error) {
        throw new AttachmentUploadError(error);
      }
      await uploadAttachments({
        vehicleId: values.vehicle_id,
        entityType: values.kind,
        entityId: savedId,
        files: newFiles,
      });
      return savedId;
    },
    // Refresh even when only the attachments failed: the record itself was saved.
    onSettled: (savedId, _error, { values }) => {
      refreshVehicle(queryClient, values.vehicle_id);
      if (savedId) {
        queryClient.invalidateQueries({ queryKey: ['record', values.kind, savedId] });
        queryClient.invalidateQueries({ queryKey: ['attachments', values.kind, savedId] });
      }
    },
  });
}

/** Deletes a record and its stored files. */
export function useDeleteRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id }: { kind: RecordKind; id: string; vehicleId: string }) => {
      const files = await listAttachments(kind, id);
      for (const file of files) await deleteAttachment(file);
      const { error } = await supabase.from(ENTITY_TABLE[kind]).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { kind, id, vehicleId }) => {
      queryClient.removeQueries({ queryKey: ['record', kind, id] });
      refreshVehicle(queryClient, vehicleId);
    },
  });
}

export function useRecordAttachments(kind: RecordKind, id: string | undefined) {
  return useQuery({
    queryKey: ['attachments', kind, id],
    enabled: !!id,
    // Signed URLs last an hour; refetch well before that.
    staleTime: 30 * 60 * 1000,
    queryFn: () => listAttachments(kind, id!),
  });
}

/** Turns database errors (e.g. odometer validation) into messages for the user. */
export function recordErrorMessage(error: Error, t: TFunction) {
  if (error instanceof AttachmentUploadError) {
    return t('attachments.uploadFailed', { message: error.message });
  }
  const match = /ODOMETER_TOO_(LOW|HIGH):(\d+)/.exec(error.message);
  if (match) {
    return match[1] === 'LOW'
      ? t('records.odometerTooLow', { value: match[2] })
      : t('records.odometerTooHigh', { value: match[2] });
  }
  return error.message || t('common.error');
}
