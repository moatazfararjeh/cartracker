import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { EmptyText, Metric, MetricRow, Note, SectionHead } from '@/components/blocks';
import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { useCurrency } from '@/features/profile/api';
import { CONSUMPTION_WARNING, useFuelAnalysis } from '@/features/fuel/api';
import { vehicleTitle } from '@/features/vehicles/display';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/dates';
import { currencyLabel, formatMoney, formatNumber } from '@/lib/format';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

/** Bars shown per chart (most recent fill-ups). */
const CHART_FILLS = 12;

export default function FuelAnalysisScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const theme = useTheme();
  const currency = useCurrency();
  const { activeVehicle } = useActiveVehicle();
  const analysis = useFuelAnalysis(activeVehicle?.id);
  const a = analysis.data;
  const cur = currencyLabel(currency, lang);

  if (!activeVehicle) {
    return (
      <FormScreen>
        <EmptyText>{t('records.needVehicle')}</EmptyText>
      </FormScreen>
    );
  }

  const economyBars = (a?.economyFills ?? []).slice(-CHART_FILLS).map((f) => ({
    key: f.id,
    value: f.liters_per_100km!,
    label: formatDate(f.filled_at, lang),
    caption: t('fuel.economyCaption', {
      date: formatDate(f.filled_at, lang, true),
      value: formatNumber(f.liters_per_100km!, lang, 1),
    }),
  }));
  const priceBars = (a?.fills ?? [])
    .filter((f) => f.price_per_liter != null)
    .slice(-CHART_FILLS)
    .map((f) => ({
      key: f.id,
      value: f.price_per_liter!,
      label: formatDate(f.filled_at, lang),
      caption: t('fuel.priceCaption', {
        date: formatDate(f.filled_at, lang, true),
        value: formatNumber(f.price_per_liter!, lang, 2),
        currency: cur,
        station: f.station ?? '',
      }),
    }));

  const rising = a?.latestChange != null && a.latestChange >= CONSUMPTION_WARNING;
  const cheapest = a?.stations.find((s) => s.avgPrice != null);

  return (
    <FormScreen>
      <ThemedText style={styles.vehicle} themeColor="textSecondary">
        {vehicleTitle(activeVehicle, lang)} · {t('fuel.period')}
      </ThemedText>

      {analysis.isPending ? (
        <ActivityIndicator />
      ) : analysis.isError || !a ? (
        <ThemedText themeColor="danger">{t('common.error')}</ThemedText>
      ) : a.fills.length === 0 ? (
        <EmptyText>{t('fuel.empty')}</EmptyText>
      ) : (
        <>
          {rising && (
            <View style={[styles.alert, { backgroundColor: theme.warningBackground }]}>
              <MaterialCommunityIcons name="alert-outline" size={20} color={theme.warningText} />
              <View style={styles.flex}>
                <ThemedText style={[styles.alertTitle, { color: theme.warningText }]}>
                  {t('fuel.risingTitle', { percent: Math.round(a.latestChange! * 100) })}
                </ThemedText>
                <ThemedText style={[styles.alertText, { color: theme.warningText }]}>
                  {t('fuel.risingTips')}
                </ThemedText>
              </View>
            </View>
          )}

          <MetricRow>
            <Metric
              label={t('fuel.avgEconomy')}
              value={a.avgPer100 != null ? formatNumber(a.avgPer100, lang, 1) : '—'}
              unit={t('fuel.per100Unit')}
            />
            <Metric
              label={t('fuel.avgPrice')}
              value={a.avgPrice != null ? formatNumber(a.avgPrice, lang, 2) : '—'}
              unit={`${cur}/${t('fuel.literUnit')}`}
            />
          </MetricRow>
          <MetricRow>
            <Metric
              label={t('fuel.costPerKm')}
              value={a.fuelCostPerKm != null ? formatNumber(a.fuelCostPerKm, lang, 2) : '—'}
              unit={`${cur}/${t('vehicles.kmUnit')}`}
            />
            <Metric
              label={t('fuel.totals', { count: a.fills.length })}
              value={formatNumber(a.totalLiters, lang)}
              unit={t('fuel.literUnit')}
            />
          </MetricRow>

          <SectionHead title={t('fuel.economyChart')} aside={t('fuel.tapHint')} />
          {economyBars.length > 0 ? (
            <View style={[styles.chartCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <BarChart
                data={economyBars}
                reference={
                  a.avgPer100 != null
                    ? {
                        value: a.avgPer100,
                        label: t('fuel.average', { value: formatNumber(a.avgPer100, lang, 1) }),
                      }
                    : undefined
                }
                accessibilityLabel={t('fuel.economyChart')}
              />
            </View>
          ) : (
            <Note>{t('insights.economyHint')}</Note>
          )}

          <SectionHead title={t('fuel.priceChart')} />
          <View style={[styles.chartCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <BarChart
              data={priceBars}
              reference={
                a.avgPrice != null
                  ? { value: a.avgPrice, label: t('fuel.average', { value: formatNumber(a.avgPrice, lang, 2) }) }
                  : undefined
              }
              accessibilityLabel={t('fuel.priceChart')}
            />
          </View>

          {a.stations.length > 0 && (
            <>
              <SectionHead title={t('fuel.stations')} aside={t('fuel.cheapestFirst')} />
              <View style={[styles.table, { borderColor: theme.border }]}>
                {a.stations.map((s, i) => (
                  <View
                    key={s.name}
                    style={[
                      styles.stationRow,
                      i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 },
                    ]}>
                    <View style={styles.flex}>
                      <ThemedText style={styles.stationName}>
                        {s.name}
                        {s === cheapest && a.stations.length > 1 ? `  · ${t('fuel.cheapest')}` : ''}
                      </ThemedText>
                      <ThemedText style={styles.stationSub} themeColor="textSecondary">
                        {t('fuel.stationFills', { count: s.fills })}
                        {s.avgPer100 != null
                          ? ` · ${formatNumber(s.avgPer100, lang, 1)} ${t('fuel.per100Unit')}`
                          : ''}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.stationPrice}>
                      {s.avgPrice != null ? formatMoney(s.avgPrice, currency, lang) : '—'}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  vehicle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  alert: {
    flexDirection: 'row',
    gap: 11,
    padding: 14,
    borderRadius: 15,
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  alertText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  chartCard: {
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  table: {
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  stationName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  stationSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  stationPrice: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    fontVariant: ['tabular-nums'],
  },
});
