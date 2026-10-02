import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { RECEIPTS_BUCKET } from '@/features/records/attachments';
import { supabase } from '@/lib/supabase';

export const FUEL_TYPES = [
  'gasoline_91',
  'gasoline_95',
  'gasoline_98',
  'diesel',
  'hybrid',
  'electric',
  'other',
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

type LookupName = { name_en: string; name_ar: string | null };

export type Vehicle = {
  id: string;
  /** English name from the lookup, or free text when "Other" was chosen. */
  make: string;
  model: string;
  make_code: string | null;
  model_id: number | null;
  make_ref: LookupName | null;
  model_ref: LookupName | null;
  year: number | null;
  plate: string | null;
  /** A VEHICLE_COLORS code. */
  color: string | null;
  fuel_type: FuelType;
  tank_capacity: number | null;
  /** Optional spending limit per calendar month. */
  monthly_budget: number | null;
  initial_odometer: number;
  current_odometer: number;
  created_at: string;
};

export type NewVehicle = Pick<Vehicle, 'make' | 'model' | 'fuel_type' | 'initial_odometer'> &
  Partial<Pick<Vehicle, 'make_code' | 'model_id' | 'year' | 'plate' | 'color' | 'tank_capacity' | 'monthly_budget'>>;

const VEHICLE_COLUMNS =
  'id, make, model, make_code, model_id, year, plate, color, fuel_type, tank_capacity, monthly_budget, initial_odometer, current_odometer, created_at, ' +
  'make_ref:vehicle_makes(name_en, name_ar), model_ref:vehicle_models(name_en, name_ar)';

export const vehicleKeys = {
  all: ['vehicles'] as const,
};

export function useVehicles() {
  return useQuery({
    queryKey: vehicleKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(VEHICLE_COLUMNS)
        .is('archived_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as Vehicle[];
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicle: NewVehicle) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicle)
        .select(VEHICLE_COLUMNS)
        .single();
      if (error) throw error;
      return data as unknown as Vehicle;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...changes }: NewVehicle & { id: string }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(changes)
        .eq('id', id)
        .select(VEHICLE_COLUMNS)
        .single();
      if (error) throw error;
      return data as unknown as Vehicle;
    },
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['vehicle-data', vehicle.id] });
    },
  });
}

/** Deletes a vehicle with all its records (database cascade) and its stored files. */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const files = await supabase.from('attachments').select('storage_path').eq('vehicle_id', id);
      if (files.error) throw files.error;
      const paths = files.data.map((f) => f.storage_path as string);
      if (paths.length > 0) {
        await supabase.storage.from(RECEIPTS_BUCKET).remove(paths);
      }
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['vehicle-data', id] });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}
