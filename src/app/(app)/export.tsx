import { useQuery } from '@tanstack/react-query';
import { addMonths, addYears, format, startOfMonth, startOfYear } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyText } from '@/components/blocks';
import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { FieldLabel } from '@/components/ui/field-label';
import { buildCsv, buildReportHtml, fetchExportRows, type Period } from '@/features/export/report';
import { useCurrency } from '@/features/profile/api';
import { vehicleTitle } from '@/features/vehicles/display';
import { useTheme } from '@/hooks/use-theme';
import { toISODate } from '@/lib/dates';
import { shareCsv, sharePdf } from '@/lib/share-file';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

const PERIODS = ['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'all'] as const;
type PeriodKey = (typeof PERIODS)[number];

function periodRange(key: PeriodKey, now = new Date()): { range: Period; start: Date | null } {
  const month = startOfMonth(now);
  const year = startOfYear(now);
  const make = (from: Date, to: Date) => ({ range: { from: toISODate(from), to: toISODate(to) }, start: from });
  switch (key) {
    case 'thisMonth':
      return make(month, addMonths(month, 1));
    case 'lastMonth':
      return make(addMonths(month, -1), month);
    case 'thisYear':
      return make(year, addYears(year, 1));
    case 'lastYear':
      return make(addYears(year, -1), year);
    default:
      return { range: { from: null, to: null }, start: null };
  }
}

export default function ExportScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const theme = useTheme();
  const currency = useCurrency();
  const { activeVehicle } = useActiveVehicle();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('thisMonth');
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { range, start } = periodRange(periodKey);
  const rows = useQuery({
    queryKey: ['vehicle-data', activeVehicle?.id, 'export', range.from, range.to],
    enabled: !!activeVehicle,
    queryFn: () => fetchExportRows(activeVehicle!.id, range),
  });

  if (!activeVehicle) {
    return (
      <FormScreen>
        <EmptyText>{t('records.needVehicle')}</EmptyText>
      </FormScreen>
    );
  }

  const locale = lang === 'ar' ? arSA : enUS;
  const periodLabel =
    periodKey === 'all'
      ? t('export.allTime')
      : periodKey.endsWith('Month')
        ? format(start!, 'MMMM yyyy', { locale })
        : format(start!, 'yyyy');
  const name = vehicleTitle(activeVehicle, lang);
  const fileBase = `car-care-${toISODate(start ?? new Date()).slice(0, periodKey.endsWith('Month') ? 7 : 4)}`;
  const count = rows.data?.length ?? 0;

  async function run(kind: 'csv' | 'pdf') {
    if (!rows.data) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'csv') {
        await shareCsv(`${fileBase}.csv`, buildCsv(rows.data, t, lang, currency));
      } else {
        const html = buildReportHtml({
          rows: rows.data,
          vehicleName: name,
          plate: activeVehicle!.plate,
          periodLabel,
          currency,
          t,
          lang,
        });
        await sharePdf(`${fileBase}.pdf`, html);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <FormScreen>
      <ThemedText style={styles.vehicle} themeColor="textSecondary">
        {name}
      </ThemedText>

      <View>
        <FieldLabel>{t('export.period')}</FieldLabel>
        <ChipSelect
          options={PERIODS.map((value) => ({ value, label: t(`export.periods.${value}`) }))}
          value={periodKey}
          onChange={setPeriodKey}
        />
      </View>

      <View style={[styles.summary, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText style={styles.summaryTitle}>{periodLabel}</ThemedText>
        {rows.isPending ? (
          <ActivityIndicator />
        ) : (
          <ThemedText themeColor="textSecondary">
            {count > 0 ? t('export.records', { count }) : t('export.noRecords')}
          </ThemedText>
        )}
      </View>

      <Button
        title={t('export.pdf')}
        loading={busy === 'pdf'}
        disabled={!count || !!busy}
        onPress={() => run('pdf')}
      />
      <ThemedText style={styles.hint} themeColor="textSecondary">
        {t('export.pdfHint')}
      </ThemedText>

      <Button
        variant="secondary"
        title={t('export.csv')}
        loading={busy === 'csv'}
        disabled={!count || !!busy}
        onPress={() => run('csv')}
      />
      <ThemedText style={styles.hint} themeColor="textSecondary">
        {t('export.csvHint')}
      </ThemedText>

      {(error || rows.isError) && <ThemedText themeColor="danger">{error ?? t('common.error')}</ThemedText>}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  vehicle: {
    fontSize: 13,
    lineHeight: 18,
  },
  summary: {
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    gap: 4,
    marginVertical: 6,
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 6,
  },
});
