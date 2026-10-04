import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyText, SectionHead } from '@/components/blocks';
import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { useCurrency } from '@/features/profile/api';
import { useAllVehicleTotals, type VehicleTotals } from '@/features/records/api';
import { vehicleTitle } from '@/features/vehicles/display';
import { useTheme } from '@/hooks/use-theme';
import { currencyLabel, formatNumber } from '@/lib/format';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

type Summary = VehicleTotals;

type MetricDef = {
  key: string;
  title: string;
  unit: string;
  digits: number;
  /** Mark the lowest value as best (only where lower is truly better: cost per km, consumption). */
  lowerIsBetter: boolean;
  value: (s: Summary) => number | null;
};

export default function CompareScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const theme = useTheme();
  const currency = useCurrency();
  const cur = currencyLabel(currency, lang);
  const { vehicles } = useActiveVehicle();

  const summaries = useAllVehicleTotals(vehicles.length > 1);

  if (vehicles.length < 2) {
    return (
      <FormScreen>
        <EmptyText>{t('compare.needTwo')}</EmptyText>
      </FormScreen>
    );
  }

  const metrics: MetricDef[] = [
    {
      key: 'costPerKm',
      title: t('compare.costPerKm'),
      unit: `${cur}/${t('vehicles.kmUnit')}`,
      digits: 2,
      lowerIsBetter: true,
      value: (s) => (s.km_last_12m ? s.cost_last_12m / s.km_last_12m : null),
    },
    {
      key: 'economy',
      title: t('compare.economy'),
      unit: t('fuel.per100Unit'),
      digits: 1,
      lowerIsBetter: true,
      value: (s) => (s.avg_km_per_liter ? 100 / s.avg_km_per_liter : null),
    },
    {
      key: 'year',
      title: t('compare.spentThisYear'),
      unit: cur,
      digits: 0,
      // Total spend depends on how much the car is driven, so no "best" here.
      lowerIsBetter: false,
      value: (s) => s.cost_this_year,
    },
    {
      key: 'distance',
      title: t('compare.distance'),
      unit: t('vehicles.kmUnit'),
      digits: 0,
      lowerIsBetter: false,
      value: (s) => s.km_last_12m,
    },
  ];

  const byVehicle = new Map(summaries.data?.map((s) => [s.vehicle_id, s]));

  return (
    <FormScreen>
      <ThemedText style={styles.intro} themeColor="textSecondary">
        {t('compare.intro')}
      </ThemedText>

      {summaries.isPending ? (
        <ActivityIndicator />
      ) : summaries.isError ? (
        <ThemedText themeColor="danger">{t('common.error')}</ThemedText>
      ) : (
        metrics.map((metric) => {
          const rows = vehicles.map((v) => {
            const s = byVehicle.get(v.id);
            return { vehicle: v, value: s ? metric.value(s) : null };
          });
          const values = rows.map((r) => r.value).filter((v): v is number => v != null && v > 0);
          const max = Math.max(...values, 0);
          const best =
            metric.lowerIsBetter && values.length > 1 ? Math.min(...values) : null;

          return (
            <View key={metric.key} style={styles.metric}>
              <SectionHead title={metric.title} aside={metric.unit} />
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                {rows.map(({ vehicle, value }) => {
                  const isBest = best != null && value === best;
                  return (
                    <View key={vehicle.id} style={styles.row}>
                      <View style={styles.rowHead}>
                        <ThemedText numberOfLines={1} style={styles.name}>
                          {vehicleTitle(vehicle, lang)}
                        </ThemedText>
                        <ThemedText style={styles.value}>
                          {value != null && value > 0 ? formatNumber(value, lang, metric.digits) : '—'}
                          {isBest ? `  ✓ ${t('compare.best')}` : ''}
                        </ThemedText>
                      </View>
                      <View style={[styles.track, { backgroundColor: theme.track }]}>
                        {value != null && value > 0 && max > 0 && (
                          <View
                            style={[
                              styles.fill,
                              { width: `${(value / max) * 100}%`, backgroundColor: theme.chart },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  metric: {
    marginBottom: 6,
  },
  card: {
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    gap: 12,
  },
  row: {
    gap: 6,
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
  },
});
