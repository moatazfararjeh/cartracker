import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type VehicleMake = {
  code: string;
  name_en: string;
  name_ar: string | null;
};

export type VehicleModel = {
  id: number;
  make_code: string;
  name_en: string;
  name_ar: string | null;
};

/** Localized name for a lookup row; falls back to English when there is no Arabic name. */
export function lookupName(row: { name_en: string; name_ar: string | null }, language: string) {
  return language === 'ar' && row.name_ar ? row.name_ar : row.name_en;
}

// Reference data rarely changes, so keep it for the whole session.
const LOOKUP_STALE_TIME = Infinity;

export function useVehicleMakes() {
  return useQuery({
    queryKey: ['vehicle-makes'],
    staleTime: LOOKUP_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_makes')
        .select('code, name_en, name_ar')
        .order('sort_order');
      if (error) throw error;
      return data as VehicleMake[];
    },
  });
}

export function useVehicleModels(makeCode: string | null) {
  return useQuery({
    queryKey: ['vehicle-models', makeCode],
    enabled: !!makeCode,
    staleTime: LOOKUP_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, make_code, name_en, name_ar')
        .eq('make_code', makeCode!)
        .order('sort_order');
      if (error) throw error;
      return data as VehicleModel[];
    },
  });
}

export const VEHICLE_COLORS = [
  { code: 'white', hex: '#FFFFFF' },
  { code: 'pearl_white', hex: '#F4F1E8' },
  { code: 'black', hex: '#111111' },
  { code: 'silver', hex: '#C0C3C7' },
  { code: 'gray', hex: '#7A7D82' },
  { code: 'red', hex: '#C62828' },
  { code: 'maroon', hex: '#6D1A24' },
  { code: 'blue', hex: '#1E5BB8' },
  { code: 'navy', hex: '#1B2A4A' },
  { code: 'green', hex: '#2E7D32' },
  { code: 'brown', hex: '#6B4A2F' },
  { code: 'beige', hex: '#D8C6A5' },
  { code: 'gold', hex: '#C9A13B' },
  { code: 'orange', hex: '#E86A1A' },
  { code: 'yellow', hex: '#F2C230' },
] as const;

export type VehicleColorCode = (typeof VEHICLE_COLORS)[number]['code'];

export function findVehicleColor(code: string | null) {
  return VEHICLE_COLORS.find((c) => c.code === code) ?? null;
}

export const OLDEST_YEAR = 1980;

export function vehicleYears() {
  const newest = new Date().getFullYear() + 1;
  return Array.from({ length: newest - OLDEST_YEAR + 1 }, (_, i) => newest - i);
}
