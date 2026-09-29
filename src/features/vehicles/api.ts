import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  initial_odometer: number;
  current_odometer: number;
  created_at: string;
};

export type NewVehicle = Pick<Vehicle, 'make' | 'model' | 'fuel_type' | 'initial_odometer'> &
  Partial<Pick<Vehicle, 'make_code' | 'model_id' | 'year' | 'plate' | 'color' | 'tank_capacity'>>;

const VEHICLE_COLUMNS =
  'id, make, model, make_code, model_id, year, plate, color, fuel_type, tank_capacity, initial_odometer, current_odometer, created_at, ' +
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
