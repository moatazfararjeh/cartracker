import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { RECEIPTS_BUCKET } from '@/features/records/attachments';
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

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (changes: Partial<Pick<Profile, 'full_name' | 'currency'>>) => {
      const { error } = await supabase.from('profiles').update(changes).eq('id', userId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

/**
 * Permanently deletes the signed-in account: stored files first (Storage API), then the user
 * row via `delete_my_account()`, which cascades to every table. Ends with a local sign-out.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const files = await supabase.from('attachments').select('storage_path');
      if (files.error) throw files.error;
      const paths = files.data.map((f) => f.storage_path as string);
      for (let i = 0; i < paths.length; i += 100) {
        const removed = await supabase.storage.from(RECEIPTS_BUCKET).remove(paths.slice(i, i + 100));
        if (removed.error) throw removed.error;
      }

      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;

      // The user no longer exists on the server, so only clear the local session.
      await supabase.auth.signOut({ scope: 'local' });
    },
    onSuccess: () => queryClient.clear(),
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
