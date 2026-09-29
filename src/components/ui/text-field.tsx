import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { FieldLabel } from '@/components/ui/field-label';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...rest }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[
          fieldStyles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.inputBorder },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  input: {
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: 'auto',
  },
});
