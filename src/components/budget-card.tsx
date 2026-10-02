import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getDaysInMonth } from 'date-fns';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Vehicle } from '@/features/vehicles/api';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/format';

/** Share of the budget at which the card turns to a warning. */
const WARNING_RATIO = 0.8;

type BudgetCardProps = {
  vehicle: Vehicle;
  spentThisMonth: number;
  currency: string;
};

/** Monthly budget progress for the selected vehicle, or a prompt to set one. */
export function BudgetCard({ vehicle, spentThisMonth, currency }: BudgetCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const lang = i18n.language;
  const budget = vehicle.monthly_budget;
  const openVehicle = () => router.push({ pathname: '/vehicles/[id]', params: { id: vehicle.id } });

  if (!budget) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={openVehicle}
        style={({ pressed }) => [
          styles.card,
          styles.prompt,
          { borderColor: theme.inputBorder, opacity: pressed ? 0.8 : 1 },
        ]}>
        <MaterialCommunityIcons name="wallet-outline" size={20} color={theme.accent} />
        <View style={styles.flex}>
          <ThemedText style={styles.title}>{t('budget.set')}</ThemedText>
          <ThemedText style={styles.detail} themeColor="textSecondary">
            {t('budget.setHint')}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  const ratio = spentThisMonth / budget;
  const today = new Date();
  // Straight-line projection of this month's spending from the days elapsed.
  const projected = (spentThisMonth / today.getDate()) * getDaysInMonth(today);

  const over = ratio > 1;
  const warning = !over && ratio >= WARNING_RATIO;
  const barColor = over ? theme.danger : warning ? theme.warningText : theme.trackFill;
  const background = over || warning ? theme.warningBackground : theme.backgroundElement;

  let status: string;
  if (over) {
    status = t('budget.over', { amount: formatMoney(spentThisMonth - budget, currency, lang) });
  } else if (warning) {
    status = t('budget.warning', {
      percent: Math.round(ratio * 100),
      amount: formatMoney(budget - spentThisMonth, currency, lang),
    });
  } else {
    status = t('budget.left', { amount: formatMoney(budget - spentThisMonth, currency, lang) });
  }
  const showProjection = !over && projected > budget;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={t('budget.editHint')}
      onPress={openVehicle}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: background, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t('budget.title')}</ThemedText>
        <ThemedText style={styles.amounts}>
          {t('budget.of', {
            spent: formatMoney(spentThisMonth, currency, lang),
            budget: formatMoney(budget, currency, lang),
          })}
        </ThemedText>
      </View>
      <View
        style={[styles.track, { backgroundColor: theme.track }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.round(ratio * 100)) }}>
        <View
          style={[styles.fill, { width: `${Math.min(100, ratio * 100)}%`, backgroundColor: barColor }]}
        />
      </View>
      <ThemedText style={[styles.detail, (over || warning) && { color: barColor }]}>{status}</ThemedText>
      {showProjection && (
        <ThemedText style={styles.detail} themeColor="textSecondary">
          {t('budget.projection', { amount: formatMoney(Math.round(projected), currency, lang) })}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    gap: 8,
    marginBottom: 21,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  amounts: {
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 9,
    borderRadius: 9,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 9,
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
  },
});
