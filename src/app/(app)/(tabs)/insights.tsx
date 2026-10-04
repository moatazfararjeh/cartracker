import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { BarLine, EmptyText, Metric, MetricRow, Note, SectionHead, ToolLink } from '@/components/blocks';
import { ThemedText } from '@/components/themed-text';
import { useCurrency } from '@/features/profile/api';
import { useVehicleSummary, useYearInsights, type YearInsights } from '@/features/records/api';
import { currencyLabel, formatMoney, formatNumber } from '@/lib/format';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

/** Spending rows: maintenance is split into spare parts and labor. */
function categoryRows(data: YearInsights) {
  return [
    { key: 'parts', labelKey: 'insights.spareParts', value: data.byKind.maintenance - data.labor },
    { key: 'labor', labelKey: 'insights.labor', value: data.labor },
    { key: 'fuel', labelKey: 'insights.fuel', value: data.byKind.fuel },
    { key: 'expense', labelKey: 'insights.otherExpenses', value: data.byKind.expense },
  ];
}

export default function InsightsScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { activeVehicle } = useActiveVehicle();
  const currency = useCurrency();
  const year = new Date().getFullYear();
  const insights = useYearInsights(activeVehicle?.id, year);
  const summary = useVehicleSummary(activeVehicle?.id);

  const data = insights.data;
  const kmPerLiter = summary.data?.avg_km_per_liter;

  return (
    <AppScreen refreshing={insights.isRefetching} onRefresh={insights.refetch}>
      <SectionHead title={t('insights.title')} aside={t('insights.yearSoFar', { year })} />
      {!activeVehicle ? (
        <EmptyText>{t('records.needVehicle')}</EmptyText>
      ) : insights.isPending ? (
        <ActivityIndicator />
      ) : !data ? (
        <ThemedText themeColor="danger">{t('common.error')}</ThemedText>
      ) : (
        <>
          <MetricRow>
            <Metric
              label={t('insights.totalSpend')}
              value={formatNumber(data.total, lang)}
              unit={currencyLabel(currency, lang)}
            />
            <Metric
              label={t('insights.distance')}
              value={formatNumber(data.distanceKm, lang)}
              unit={t('vehicles.kmUnit')}
            />
          </MetricRow>

          <SectionHead title={t('insights.byCategory')} />
          <View style={styles.bars}>
            {categoryRows(data).map(({ key, labelKey, value }) => (
              <BarLine
                key={key}
                label={t(labelKey)}
                value={formatMoney(value, currency, lang)}
                ratio={data.total > 0 ? value / data.total : 0}
              />
            ))}
          </View>

          <Note>
            {kmPerLiter
              ? t('insights.economy', { value: formatNumber(100 / kmPerLiter, lang, 1) })
              : t('insights.economyHint')}
          </Note>
        </>
      )}

      {activeVehicle && (
        <View style={styles.tools}>
          <SectionHead title={t('tools.title')} />
          <ToolLink
            icon="gas-station"
            title={t('tools.fuel')}
            hint={t('tools.fuelHint')}
            onPress={() => router.push('/fuel')}
          />
          <ToolLink
            icon="file-export-outline"
            title={t('tools.export')}
            hint={t('tools.exportHint')}
            onPress={() => router.push('/export')}
          />
          <ToolLink
            icon="compare-horizontal"
            title={t('tools.compare')}
            hint={t('tools.compareHint')}
            onPress={() => router.push('/compare')}
          />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bars: {
    marginTop: -11,
    marginBottom: 8,
  },
  tools: {
    marginTop: 24,
  },
});
