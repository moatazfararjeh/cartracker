import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FieldLabel } from '@/components/ui/field-label';
import { fieldStyles } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  /** Secondary line under the label. */
  description?: string;
  /** Extra text matched by search, e.g. the English name when the label is Arabic. */
  keywords?: string;
  leading?: ReactNode;
};

type OptionSheetProps<T extends string | number> = {
  visible: boolean;
  title: string;
  options: SelectOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
  searchable?: boolean;
  /** Rendered under the list, e.g. an "Add vehicle" action. */
  footer?: ReactNode;
};

/** Full-screen sheet listing options; used by SelectField and custom pickers. */
export function OptionSheet<T extends string | number>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  searchable = false,
  footer,
}: OptionSheetProps<T>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.keywords ?? ''}`.toLowerCase().includes(q));
  }, [options, query]);

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={close}>
      <ThemedView style={styles.sheet}>
        <SafeAreaView style={styles.sheetInner} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold" style={styles.sheetTitle}>
              {title}
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
              <ThemedText style={{ color: theme.accent }}>{t('common.close')}</ThemedText>
            </Pressable>
          </View>

          {searchable && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('common.search')}
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              style={[
                fieldStyles.input,
                styles.search,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.inputBorder },
              ]}
            />
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onSelect(item.value);
                    close();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    { borderBottomColor: theme.border },
                    (pressed || isSelected) && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  {item.leading}
                  <View style={styles.optionText}>
                    <ThemedText style={styles.optionLabel}>{item.label}</ThemedText>
                    {item.description && (
                      <ThemedText style={styles.optionDescription} themeColor="textSecondary">
                        {item.description}
                      </ThemedText>
                    )}
                  </View>
                  {isSelected && <ThemedText style={{ color: theme.accent }}>✓</ThemedText>}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {t('common.noResults')}
              </ThemedText>
            }
            ListFooterComponent={footer ? <View style={styles.footer}>{footer}</View> : null}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

type SelectFieldProps<T extends string | number> = {
  label: string;
  placeholder: string;
  options: SelectOption<T>[];
  value: T | null;
  /** Shown when the value is not one of the options (e.g. free text entered under "Other"). */
  displayValue?: string;
  onChange: (value: T) => void;
  searchable?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export function SelectField<T extends string | number>({
  label,
  placeholder,
  options,
  value,
  displayValue,
  onChange,
  searchable = false,
  disabled = false,
  loading = false,
}: SelectFieldProps<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const shownText = selected?.label ?? displayValue;

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: shownText ?? placeholder }}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        style={[
          fieldStyles.input,
          styles.field,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.inputBorder,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        {selected?.leading}
        <ThemedText
          numberOfLines={1}
          style={styles.fieldText}
          themeColor={shownText ? 'text' : 'textSecondary'}>
          {shownText ?? placeholder}
        </ThemedText>
        {loading ? (
          <ActivityIndicator size="small" />
        ) : (
          <ThemedText themeColor="textSecondary">▾</ThemedText>
        )}
      </Pressable>

      <OptionSheet
        visible={open}
        title={label}
        options={options}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
        searchable={searchable}
      />
    </View>
  );
}

export function ColorSwatch({ hex }: { hex: string }) {
  const theme = useTheme();
  return <View style={[styles.swatch, { backgroundColor: hex, borderColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
  },
  sheet: {
    flex: 1,
  },
  sheetInner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
  },
  search: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  option: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.four,
  },
  footer: {
    padding: Spacing.three,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
