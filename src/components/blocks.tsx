import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ActivityItem, ExpenseCategory } from '@/features/records/api';
import { lookupName } from '@/features/vehicles/lookups';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/dates';
import { formatMoney, formatNumber } from '@/lib/format';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function SectionHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={styles.sectionHead}>
      <ThemedText style={styles.h2}>{title}</ThemedText>
      {aside && (
        <ThemedText style={styles.muted} themeColor="textSecondary">
          {aside}
        </ThemedText>
      )}
    </View>
  );
}

export function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText style={styles.metricLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.metricValue}>
        {value} <ThemedText style={styles.metricUnit}>{unit}</ThemedText>
      </ThemedText>
    </View>
  );
}

export function MetricRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.metrics}>{children}</View>;
}

export function DueCard({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.due,
        { backgroundColor: theme.warningBackground, opacity: pressed ? 0.85 : 1 },
      ]}>
      <MaterialCommunityIcons
        name="calendar-clock"
        size={18}
        color={theme.warningText}
        style={styles.dueIcon}
      />
      <View style={styles.flex}>
        <ThemedText style={[styles.dueTitle, { color: theme.warningText }]}>{title}</ThemedText>
        <ThemedText style={[styles.dueDetail, { color: theme.warningText }]}>{detail}</ThemedText>
      </View>
      {onPress && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.warningText}
          style={styles.dueChevron}
        />
      )}
    </Pressable>
  );
}

export function Note({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: theme.noteBackground }]}>
      <ThemedText style={[styles.noteText, { color: theme.noteText }]}>{children}</ThemedText>
    </View>
  );
}

export function BarLine({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  const theme = useTheme();
  return (
    <View style={styles.barLine}>
      <View style={styles.barLabel}>
        <ThemedText style={styles.barText}>{label}</ThemedText>
        <ThemedText style={styles.barText}>{value}</ThemedText>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.track }]}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: theme.trackFill, width: `${Math.round(Math.min(1, ratio) * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

const EXPENSE_ICONS: Record<ExpenseCategory, IconName> = {
  insurance: 'shield-car',
  registration: 'card-account-details-outline',
  inspection: 'clipboard-check-outline',
  parking: 'parking',
  fine: 'alert-octagon-outline',
  wash: 'car-wash',
  toll: 'road-variant',
  other: 'receipt-text-outline',
};

function activityIcon(item: ActivityItem): IconName {
  if (item.kind === 'fuel') return 'gas-station';
  if (item.kind === 'maintenance') return 'wrench-outline';
  return EXPENSE_ICONS[item.category];
}

/** One history row: icon, title, "date · km · place", amount. */
export function ActivityRow({
  item,
  currency,
  withYear = false,
  last = false,
}: {
  item: ActivityItem;
  currency: string;
  withYear?: boolean;
  last?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const lang = i18n.language;

  let title: string;
  let place: string | null = null;
  if (item.kind === 'fuel') {
    title = t('history.fuelFillUp');
    place = item.station;
  } else if (item.kind === 'maintenance') {
    title = item.parts.map((p) => lookupName(p, lang)).join(' + ') || t('records.maintenance');
    place = item.workshop;
  } else {
    title = t(`expenseCategories.${item.category}`);
    place = item.notes;
  }

  const sub = [
    formatDate(item.date, lang, withYear),
    item.odometer != null ? t('vehicles.km', { value: formatNumber(item.odometer, lang) }) : null,
    item.kind === 'fuel' ? t('history.liters', { value: formatNumber(item.liters, lang, 2) }) : null,
    place,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('records.tapToEdit')}
      onPress={() =>
        router.push({ pathname: '/records/[kind]/[id]', params: { kind: item.kind, id: item.id } })
      }
      style={({ pressed }) => [
        styles.entry,
        !last && { borderBottomColor: theme.border, borderBottomWidth: 1 },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.iconBackground }]}>
        <MaterialCommunityIcons name={activityIcon(item)} size={18} color={theme.icon} />
      </View>
      <View style={styles.entryMain}>
        <ThemedText numberOfLines={1} style={styles.entryTitle}>
          {title}
        </ThemedText>
        <ThemedText numberOfLines={1} style={styles.entrySub} themeColor="textSecondary">
          {sub}
        </ThemedText>
      </View>
      <ThemedText style={styles.entryCost}>{formatMoney(item.amount, currency, lang)}</ThemedText>
    </Pressable>
  );
}

export function EmptyText({ children }: { children: string }) {
  return (
    <ThemedText style={styles.emptyText} themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 11,
  },
  h2: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  muted: {
    fontSize: 12,
    lineHeight: 16,
  },
  metrics: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metric: {
    flex: 1,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  metricValue: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: 500,
    marginTop: 7,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: 400,
  },
  due: {
    flexDirection: 'row',
    gap: 11,
    padding: 14,
    borderRadius: 15,
    marginBottom: 21,
  },
  dueIcon: {
    marginTop: 2,
  },
  dueChevron: {
    alignSelf: 'center',
    transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
  },
  dueTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  dueDetail: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  note: {
    padding: 14,
    borderRadius: 12,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  barLine: {
    marginVertical: 16,
  },
  barLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barText: {
    fontSize: 13,
    lineHeight: 18,
  },
  barTrack: {
    height: 9,
    borderRadius: 9,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 9,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMain: {
    flex: 1,
    minWidth: 0,
  },
  entryTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
  },
  entrySub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  entryCost: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 12,
  },
});
