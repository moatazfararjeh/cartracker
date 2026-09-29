import { View } from 'react-native';

import { FieldLabel } from '@/components/ui/field-label';
import { useTheme } from '@/hooks/use-theme';
import { toISODate } from '@/lib/dates';

type DateFieldProps = {
  label: string;
  /** YYYY-MM-DD */
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
};

/** The community date picker has no web build, so use the browser's date input. */
export function DateField({ label, value, onChange, maximumDate }: DateFieldProps) {
  const theme = useTheme();

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="date"
        aria-label={label}
        value={value}
        max={maximumDate ? toISODate(maximumDate) : undefined}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          minWidth: 0,
          height: 43,
          borderRadius: 10,
          padding: '0 10px',
          border: `1px solid ${theme.inputBorder}`,
          backgroundColor: theme.backgroundElement,
          color: theme.text,
          font: 'inherit',
          fontSize: 14,
        }}
      />
    </View>
  );
}
