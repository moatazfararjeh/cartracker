import { useQuery } from '@tanstack/react-query';

import type { FuelType } from '@/features/vehicles/api';
import { supabase } from '@/lib/supabase';

/** One fill-up with the distance / economy the database works out between full tanks. */
export type FuelFill = {
  id: string;
  filled_at: string;
  odometer: number;
  liters: number;
  total_cost: number;
  price_per_liter: number | null;
  station: string | null;
  fuel_type: FuelType | null;
  is_full_tank: boolean;
  distance_km: number | null;
  liters_per_100km: number | null;
};

export type StationStats = {
  name: string;
  fills: number;
  avgPrice: number | null;
  avgPer100: number | null;
};

export type FuelAnalysis = {
  fills: FuelFill[];
  /** Fills with a consumption figure, oldest first (for the chart). */
  economyFills: FuelFill[];
  avgPer100: number | null;
  latestPer100: number | null;
  /** Latest consumption vs. the average, e.g. 0.18 = 18% higher. */
  latestChange: number | null;
  avgPrice: number | null;
  latestPrice: number | null;
  totalLiters: number;
  totalCost: number;
  fuelCostPerKm: number | null;
  stations: StationStats[];
};

/** A fill-up this much above the average consumption raises a warning. */
export const CONSUMPTION_WARNING = 0.15;
const MONTHS = 12;

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

export function analyzeFuel(fills: FuelFill[]): FuelAnalysis {
  const oldestFirst = [...fills].sort(
    (a, b) => a.filled_at.localeCompare(b.filled_at) || a.odometer - b.odometer
  );
  const economyFills = oldestFirst.filter((f) => f.liters_per_100km != null);
  const per100 = economyFills.map((f) => f.liters_per_100km!);
  const prices = oldestFirst.map((f) => f.price_per_liter).filter((p): p is number => p != null);

  const avgPer100 = mean(per100);
  const latestPer100 = per100.at(-1) ?? null;
  const latestChange =
    avgPer100 && latestPer100 != null && per100.length >= 3 ? latestPer100 / avgPer100 - 1 : null;

  const distance = oldestFirst.length > 1 ? oldestFirst.at(-1)!.odometer - oldestFirst[0]!.odometer : 0;
  // The first fill's fuel was burned before the period starts, so leave its cost out.
  const costAfterFirst = oldestFirst.slice(1).reduce((sum, f) => sum + f.total_cost, 0);

  const byStation = new Map<string, FuelFill[]>();
  for (const fill of oldestFirst) {
    const name = fill.station?.trim();
    if (!name) continue;
    byStation.set(name, [...(byStation.get(name) ?? []), fill]);
  }
  const stations = [...byStation.entries()]
    .map(([name, list]) => ({
      name,
      fills: list.length,
      avgPrice: mean(list.map((f) => f.price_per_liter).filter((p): p is number => p != null)),
      avgPer100: mean(list.map((f) => f.liters_per_100km).filter((p): p is number => p != null)),
    }))
    .sort((a, b) => (a.avgPrice ?? Infinity) - (b.avgPrice ?? Infinity));

  return {
    fills: oldestFirst,
    economyFills,
    avgPer100,
    latestPer100,
    latestChange,
    avgPrice: mean(prices),
    latestPrice: prices.at(-1) ?? null,
    totalLiters: oldestFirst.reduce((sum, f) => sum + f.liters, 0),
    totalCost: oldestFirst.reduce((sum, f) => sum + f.total_cost, 0),
    fuelCostPerKm: distance > 0 ? costAfterFirst / distance : null,
    stations,
  };
}

/** Fill-ups of the last 12 months with economy figures, analysed. */
export function useFuelAnalysis(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-data', vehicleId, 'fuel-analysis'],
    enabled: !!vehicleId,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - MONTHS);
      const { data, error } = await supabase
        .from('v_fuel_stats')
        .select(
          'id, filled_at, odometer, liters, total_cost, price_per_liter, station, fuel_type, is_full_tank, distance_km, liters_per_100km'
        )
        .eq('vehicle_id', vehicleId!)
        .gte('filled_at', since.toISOString().slice(0, 10))
        .order('filled_at');
      if (error) throw error;
      const fills = (data as Record<string, unknown>[]).map(
        (row) =>
          ({
            ...row,
            liters: Number(row.liters),
            total_cost: Number(row.total_cost),
            price_per_liter: row.price_per_liter == null ? null : Number(row.price_per_liter),
            liters_per_100km: row.liters_per_100km == null ? null : Number(row.liters_per_100km),
          }) as FuelFill
      );
      return analyzeFuel(fills);
    },
  });
}
