import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function FieldLabel({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <ThemedText style={[styles.label, { color: theme.eyebrow }]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 5,
  },
});
