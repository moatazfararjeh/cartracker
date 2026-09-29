import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FieldLabel } from '@/components/ui/field-label';
import { fieldStyles } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, parseISODate, toISODate } from '@/lib/dates';

type DateFieldProps = {
  label: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
};

export function DateField({ label, value, onChange, maximumDate }: DateFieldProps) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const date = parseISODate(value);

  if (Platform.OS === 'ios') {
    return (
      <View>
        <FieldLabel>{label}</FieldLabel>
        <View
          style={[
            fieldStyles.input,
            styles.iosField,
            { backgroundColor: theme.backgroundElement, borderColor: theme.inputBorder },
          ]}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={maximumDate}
            locale={i18n.language}
            accentColor={theme.tint}
            onValueChange={(_event, next) => onChange(toISODate(next))}
          />
        </View>
      </View>
    );
  }

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            maximumDate,
            onValueChange: (_event, next) => onChange(toISODate(next)),
          })
        }
        style={[
          fieldStyles.input,
          styles.androidField,
          { backgroundColor: theme.backgroundElement, borderColor: theme.inputBorder },
        ]}>
        <ThemedText style={styles.text}>{formatDate(value, i18n.language, true)}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  iosField: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
  },
  androidField: {
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
  },
});
