import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import {
  useServiceIntervals,
  useSetServiceInterval,
  type ServiceInterval,
} from '@/features/service-intervals/api';
import { lookupName } from '@/features/vehicles/lookups';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';
import { parseNumber } from '@/lib/numbers';

export default function ServiceIntervalsScreen() {
  const { t } = useTranslation();
  const intervals = useServiceIntervals();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <FormScreen>
      <ThemedText style={styles.intro} themeColor="textSecondary">
        {t('intervals.intro')}
      </ThemedText>
      {intervals.isPending ? (
        <ActivityIndicator />
      ) : intervals.isError ? (
        <ThemedText themeColor="danger">{t('common.error')}</ThemedText>
      ) : (
        intervals.data.map((item) => (
          <IntervalRow
            key={item.categoryId}
            item={item}
            open={openId === item.categoryId}
            onToggle={() => setOpenId(openId === item.categoryId ? null : item.categoryId)}
            onDone={() => setOpenId(null)}
          />
        ))
      )}
    </FormScreen>
  );
}

function useIntervalText() {
  const { t, i18n } = useTranslation();
  return (km: number | null, months: number | null) => {
    const parts = [
      km != null && `${formatNumber(km, i18n.language)} ${t('vehicles.kmUnit')}`,
      months != null && t('intervals.monthsValue', { value: formatNumber(months, i18n.language) }),
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : t('intervals.none');
  };
}

function IntervalRow({
  item,
  open,
  onToggle,
  onDone,
}: {
  item: ServiceInterval;
  open: boolean;
  onToggle: () => void;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const intervalText = useIntervalText();
  const save = useSetServiceInterval();
  const [km, setKm] = useState(item.km?.toString() ?? '');
  const [months, setMonths] = useState(item.months?.toString() ?? '');
  const [invalid, setInvalid] = useState(false);

  function toggle() {
    // Start editing from the values in effect.
    setKm(item.km?.toString() ?? '');
    setMonths(item.months?.toString() ?? '');
    setInvalid(false);
    save.reset();
    onToggle();
  }

  function onSave() {
    const kmValue = parseNumber(km);
    const monthsValue = parseNumber(months);
    const valid = (v: number | null) => v == null || (Number.isInteger(v) && v > 0);
    if (!valid(kmValue) || !valid(monthsValue)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    save.mutate(
      { categoryId: item.categoryId, values: { km: kmValue, months: monthsValue } },
      { onSuccess: onDone }
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={styles.header}>
        <View style={styles.main}>
          <ThemedText style={styles.name}>{lookupName(item, i18n.language)}</ThemedText>
          <ThemedText style={styles.sub} themeColor="textSecondary">
            {intervalText(item.km, item.months)}
            {item.custom ? `  · ${t('intervals.custom')}` : ''}
          </ThemedText>
        </View>
        <ThemedText style={{ color: theme.accent }}>{open ? t('common.cancel') : t('common.edit')}</ThemedText>
      </Pressable>

      {open && (
        <View style={styles.editor}>
          <View style={styles.fields}>
            <View style={styles.field}>
              <TextField
                label={t('intervals.everyKm')}
                value={km}
                onChangeText={setKm}
                keyboardType="number-pad"
                placeholder="—"
              />
            </View>
            <View style={styles.field}>
              <TextField
                label={t('intervals.everyMonths')}
                value={months}
                onChangeText={setMonths}
                keyboardType="number-pad"
                placeholder="—"
              />
            </View>
          </View>
          <ThemedText style={styles.sub} themeColor="textSecondary">
            {t('intervals.default', { value: intervalText(item.defaultKm, item.defaultMonths) })}
            {'\n'}
            {t('intervals.emptyHint')}
          </ThemedText>
          {invalid && <ThemedText themeColor="danger">{t('intervals.invalid')}</ThemedText>}
          {save.error && <ThemedText themeColor="danger">{save.error.message}</ThemedText>}
          <Button title={t('common.save')} loading={save.isPending && save.variables?.values != null} onPress={onSave} />
          {item.custom && (
            <Button
              title={t('intervals.reset')}
              variant="secondary"
              loading={save.isPending && save.variables?.values == null}
              disabled={save.isPending}
              onPress={() => save.mutate({ categoryId: item.categoryId, values: null }, { onSuccess: onDone })}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  card: {
    borderRadius: 15,
    borderWidth: 1,
  },
  header: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 500,
  },
  sub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  editor: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  fields: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
  },
});
