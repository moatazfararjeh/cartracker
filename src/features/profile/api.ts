import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

export type Profile = {
  id: string;
  full_name: string | null;
  currency: string;
};

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, currency')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** Currency for amounts; SAR until the profile loads. */
export function useCurrency() {
  return useProfile().data?.currency ?? 'SAR';
}

/** Up to two initials from the profile name or email, e.g. "MF". */
export function useInitials() {
  const { session } = useSession();
  const { data } = useProfile();
  const name = data?.full_name || (session?.user.user_metadata?.full_name as string | undefined);
  const source = name?.trim() || session?.user.email || '';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
