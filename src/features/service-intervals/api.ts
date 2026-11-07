import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** A part with its system default interval and the user's override, if any. */
export type ServiceInterval = {
  categoryId: string;
  name_en: string;
  name_ar: string | null;
  defaultKm: number | null;
  defaultMonths: number | null;
  /** True when the user has set their own interval for this part. */
  custom: boolean;
  /** The interval in effect: the override when custom, else the default. */
  km: number | null;
  months: number | null;
};

const intervalKeys = { all: ['service-intervals'] as const };

export function useServiceIntervals() {
  return useQuery({
    queryKey: intervalKeys.all,
    queryFn: async (): Promise<ServiceInterval[]> => {
      const [categories, overrides] = await Promise.all([
        supabase
          .from('part_categories')
          .select('id, name_en, name_ar, default_interval_km, default_interval_months')
          .order('sort_order'),
        supabase.from('user_part_intervals').select('category_id, interval_km, interval_months'),
      ]);
      if (categories.error) throw categories.error;
      if (overrides.error) throw overrides.error;

      const byCategory = new Map(overrides.data.map((o) => [o.category_id as string, o]));
      return categories.data.map((c) => {
        const o = byCategory.get(c.id);
        return {
          categoryId: c.id,
          name_en: c.name_en,
          name_ar: c.name_ar,
          defaultKm: c.default_interval_km,
          defaultMonths: c.default_interval_months,
          custom: !!o,
          km: o ? o.interval_km : c.default_interval_km,
          months: o ? o.interval_months : c.default_interval_months,
        };
      });
    },
  });
}

/** Set (values) or reset (null) the user's interval for one part. */
export function useSetServiceInterval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      values,
    }: {
      categoryId: string;
      values: { km: number | null; months: number | null } | null;
    }) => {
      const { error } = values
        ? await supabase.from('user_part_intervals').upsert({
            category_id: categoryId,
            interval_km: values.km,
            interval_months: values.months,
            updated_at: new Date().toISOString(),
          })
        : await supabase.from('user_part_intervals').delete().eq('category_id', categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intervalKeys.all });
      // The database reschedules reminders on every vehicle, so refresh them all.
      queryClient.invalidateQueries({ queryKey: ['vehicle-data'] });
    },
  });
}
