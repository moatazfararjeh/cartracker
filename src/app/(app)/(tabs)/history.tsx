import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { ActivityRow, EmptyText, SectionHead } from '@/components/blocks';
import { ThemedText } from '@/components/themed-text';
import { useCurrency } from '@/features/profile/api';
import { useActivity } from '@/features/records/api';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { activeVehicle } = useActiveVehicle();
  const currency = useCurrency();
  const activity = useActivity(activeVehicle?.id);
  const items = activity.data ?? [];

  return (
    <AppScreen refreshing={activity.isRefetching} onRefresh={activity.refetch}>
      <SectionHead title={t('history.title')} aside={t('history.newestFirst')} />
      {!activeVehicle ? (
        <EmptyText>{t('records.needVehicle')}</EmptyText>
      ) : activity.isPending ? (
        <ActivityIndicator />
      ) : activity.isError ? (
        <ThemedText themeColor="danger">{t('common.error')}</ThemedText>
      ) : items.length === 0 ? (
        <EmptyText>{t('home.noActivity')}</EmptyText>
      ) : (
        items.map((item, index) => (
          <ActivityRow
            key={`${item.kind}-${item.id}`}
            item={item}
            currency={currency}
            withYear
            last={index === items.length - 1}
          />
        ))
      )}
    </AppScreen>
  );
}
