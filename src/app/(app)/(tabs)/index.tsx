import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ActivityRow, DueCard, EmptyText, Metric, MetricRow, SectionHead } from '@/components/blocks';
import { DocumentCards } from '@/components/document-cards';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { currencyLabel, formatNumber } from '@/lib/format';
import { formatDate } from '@/lib/dates';
import { useCurrency } from '@/features/profile/api';
import {
  useActivity,
  useUpcoming,
  useVehicleSummary,
  type UpcomingItem,
} from '@/features/records/api';
import { lookupName } from '@/features/vehicles/lookups';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

const RECENT_COUNT = 3;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { activeVehicle, isPending, isError, refetch } = useActiveVehicle();
  const currency = useCurrency();
  const vehicleId = activeVehicle?.id;

  const summary = useVehicleSummary(vehicleId);
  const upcoming = useUpcoming(vehicleId);
  const activity = useActivity(vehicleId);

  const refreshing = summary.isRefetching || activity.isRefetching;
  const refresh = () => {
    refetch();
    summary.refetch();
    upcoming.refetch();
    activity.refetch();
  };

  if (isPending) {
    return (
      <AppScreen>
        <ActivityIndicator style={styles.loading} />
      </AppScreen>
    );
  }

  if (isError) {
    return (
      <AppScreen onRefresh={refetch}>
        <View style={styles.center}>
          <ThemedText themeColor="danger">{t('vehicles.loadError')}</ThemedText>
          <Button title={t('vehicles.retry')} variant="secondary" onPress={() => refetch()} />
        </View>
      </AppScreen>
    );
  }

  if (!activeVehicle) {
    return (
      <AppScreen>
        <View style={styles.center}>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            {t('home.empty')}
          </ThemedText>
          <Button title={t('vehicles.add')} onPress={() => router.push('/vehicles/new')} />
        </View>
      </AppScreen>
    );
  }

  const next = upcoming.data?.[0];
  const recent = activity.data?.slice(0, RECENT_COUNT) ?? [];

  return (
    <AppScreen refreshing={refreshing} onRefresh={refresh}>
      <SectionHead title={t('home.overview')} />
      <MetricRow>
        <Metric
          label={t('home.currentMileage')}
          value={formatNumber(activeVehicle.current_odometer, lang)}
          unit={t('vehicles.kmUnit')}
        />
        <Metric
          label={t('home.spentThisMonth')}
          value={formatNumber(summary.data?.cost_this_month ?? 0, lang)}
          unit={currencyLabel(currency, lang)}
        />
      </MetricRow>

      {next ? (
        <DueCard {...dueText(next, t, lang)} />
      ) : (
        upcoming.isSuccess && (
          <DueCard title={t('home.nothingDue')} detail={t('home.nothingDueDetail')} />
        )
      )}

      <SectionHead title={t('documents.section')} />
      <DocumentCards vehicleId={activeVehicle.id} />

      <SectionHead title={t('home.quickAdd')} />
      <View style={styles.quick}>
        <Button
          style={styles.flex}
          title={t('home.addMaintenance')}
          onPress={() => router.navigate({ pathname: '/add', params: { type: 'maintenance' } })}
        />
        <Button
          style={styles.flex}
          variant="secondary"
          title={t('home.addFuel')}
          onPress={() => router.navigate({ pathname: '/add', params: { type: 'fuel' } })}
        />
      </View>

      <SectionHead title={t('home.recentActivity')} aside={t('home.latestRecords')} />
      {activity.isPending ? (
        <ActivityIndicator />
      ) : recent.length === 0 ? (
        <EmptyText>{t('home.noActivity')}</EmptyText>
      ) : (
        recent.map((item, index) => (
          <ActivityRow
            key={`${item.kind}-${item.id}`}
            item={item}
            currency={currency}
            last={index === recent.length - 1}
          />
        ))
      )}
    </AppScreen>
  );
}

function dueText(item: UpcomingItem, t: TFunction, lang: string) {
  const name = item.expense_category
    ? t(`expenseCategories.${item.expense_category}`)
    : lookupName(item, lang);

  const title =
    item.status === 'overdue'
      ? t('home.dueOverdue', { name })
      : item.status === 'soon'
        ? t('home.dueSoon', { name })
        : t('home.dueOk', { name });

  let detail = '';
  if (item.due_km != null && item.km_left != null) {
    const left =
      item.km_left >= 0
        ? t('home.kmLeft', { km: formatNumber(item.km_left, lang) })
        : t('home.kmOver', { km: formatNumber(-item.km_left, lang) });
    detail = `${t('home.dueAtKm', { km: formatNumber(item.due_km, lang) })} · ${left}`;
  } else if (item.due_date && item.days_left != null) {
    const left =
      item.days_left >= 0
        ? t('home.daysLeft', { count: item.days_left })
        : t('home.daysOver', { count: -item.days_left });
    detail = `${t('home.dueOnDate', { date: formatDate(item.due_date, lang, true) })} · ${left}`;
  }

  return { title, detail };
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    marginTop: 40,
  },
  center: {
    gap: 16,
    paddingVertical: 24,
  },
  centerText: {
    textAlign: 'center',
  },
  quick: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 22,
  },
});
