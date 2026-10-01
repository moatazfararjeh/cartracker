import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/blocks';
import { EmptyText } from '@/components/blocks';
import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import {
  useDismissReminder,
  useUpcoming,
  type UpcomingItem,
} from '@/features/records/api';
import { reminderText } from '@/features/records/reminder-text';
import { vehicleTitle } from '@/features/vehicles/display';
import { useTheme } from '@/hooks/use-theme';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';
import { useConfirm } from '@/providers/confirm-provider';

function reminderIcon(item: UpcomingItem): IconName {
  if (item.expense_category === 'insurance') return 'shield-car';
  if (item.expense_category === 'registration') return 'card-account-details-outline';
  if (item.expense_category) return 'clipboard-check-outline';
  return 'wrench-outline';
}

export default function RemindersScreen() {
  const { t, i18n } = useTranslation();
  const { activeVehicle } = useActiveVehicle();
  const upcoming = useUpcoming(activeVehicle?.id);
  const items = upcoming.data ?? [];

  return (
    <FormScreen>
      {activeVehicle && (
        <ThemedText style={styles.vehicle} themeColor="textSecondary">
          {vehicleTitle(activeVehicle, i18n.language)}
        </ThemedText>
      )}
      {upcoming.isPending ? (
        <ActivityIndicator />
      ) : upcoming.isError ? (
        <ThemedText themeColor="danger">{t('common.error')}</ThemedText>
      ) : items.length === 0 ? (
        <EmptyText>{t('home.nothingDueDetail')}</EmptyText>
      ) : (
        items.map((item) => <ReminderRow key={item.id} item={item} vehicleId={activeVehicle!.id} />)
      )}
    </FormScreen>
  );
}

function ReminderRow({ item, vehicleId }: { item: UpcomingItem; vehicleId: string }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const dismiss = useDismissReminder();
  const confirm = useConfirm();
  const { title, detail } = reminderText(item, t, i18n.language);

  const statusColor =
    item.status === 'overdue' ? theme.danger : item.status === 'soon' ? theme.warningText : theme.accent;
  const background = item.status === 'ok' ? theme.backgroundElement : theme.warningBackground;

  async function onDismiss() {
    const ok = await confirm({
      title: t('reminders.dismissTitle'),
      message: t('reminders.dismissMessage'),
      confirmText: t('reminders.dismiss'),
      cancelText: t('common.cancel'),
    });
    if (ok) dismiss.mutate({ id: item.id, vehicleId });
  }

  return (
    <View style={[styles.row, { backgroundColor: background, borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: theme.iconBackground }]}>
        <MaterialCommunityIcons name={reminderIcon(item)} size={18} color={theme.icon} />
      </View>
      <View style={styles.main}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {!!detail && (
          <ThemedText style={styles.detail} themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
        <ThemedText style={[styles.status, { color: statusColor }]}>
          {t(`reminders.status.${item.status}`)}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('reminders.dismiss')}
        hitSlop={10}
        disabled={dismiss.isPending}
        onPress={onDismiss}>
        <MaterialCommunityIcons name="bell-off-outline" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  vehicle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  detail: {
    fontSize: 12,
    lineHeight: 16,
  },
  status: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 600,
  },
});
