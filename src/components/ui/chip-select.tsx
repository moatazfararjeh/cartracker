import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FieldLabel } from '@/components/ui/field-label';
import { useTheme } from '@/hooks/use-theme';

type ChipSelectProps<T extends string> = {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Stretch chips to share one row equally (segmented control look). */
  fill?: boolean;
};

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  fill = false,
}: ChipSelectProps<T>) {
  const theme = useTheme();

  return (
    <View>
      {label && <FieldLabel>{label}</FieldLabel>}
      <View
        style={[styles.chips, fill && styles.fillRow]}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.chip,
                fill && styles.fillChip,
                selected
                  ? { backgroundColor: theme.chipSelected, borderColor: theme.chipSelectedBorder }
                  : { backgroundColor: theme.backgroundElement, borderColor: theme.inputBorder },
              ]}>
              <ThemedText
                numberOfLines={1}
                style={[styles.text, { color: selected ? theme.chipSelectedText : theme.text }]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  fillRow: {
    flexWrap: 'nowrap',
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillChip: {
    flex: 1,
    paddingHorizontal: 5,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
  },
});
