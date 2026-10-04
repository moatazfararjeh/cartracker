import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useCurrency } from '@/features/profile/api';
import { useAllVehicleTotals } from '@/features/records/api';
import type { Vehicle } from '@/features/vehicles/api';
import { vehicleSubtitle, vehicleTitle } from '@/features/vehicles/display';
import { findVehicleColor } from '@/features/vehicles/lookups';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/format';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

/** Car icon with a dot in the vehicle's color (when it has one). */
export function VehicleIcon({ vehicle, size = 40 }: { vehicle: Vehicle; size?: number }) {
  const theme = useTheme();
  const color = findVehicleColor(vehicle.color);
  return (
    <View
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: theme.iconBackground },
      ]}>
      <MaterialCommunityIcons name="car-outline" size={size * 0.5} color={theme.accent} />
      {color && (
        <View
          style={[
            styles.colorDot,
            // Gray outline keeps light colors (white, silver, pearl) visible on the light icon tile.
            { backgroundColor: color.hex, borderColor: theme.inputBorder },
          ]}
        />
      )}
    </View>
  );
}

type VehicleSwitcherProps = {
  visible: boolean;
  onClose: () => void;
};

/** Bottom sheet listing the user's vehicles as cards; tap to switch, pencil to edit. */
export function VehicleSwitcher({ visible, onClose }: VehicleSwitcherProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const currency = useCurrency();
  const { vehicles, activeVehicle, setActiveVehicleId } = useActiveVehicle();
  const totals = useAllVehicleTotals(visible);
  const monthByVehicle = new Map(totals.data?.map((s) => [s.vehicle_id, s.cost_this_month]));

  function go(path: () => void) {
    onClose();
    path();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHeader}>
            <View style={styles.flex}>
              <ThemedText style={styles.sheetTitle}>{t('switcher.title')}</ThemedText>
              <ThemedText style={styles.sheetSub} themeColor="textSecondary">
                {t('switcher.count', { count: vehicles.length })}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={onClose}
              hitSlop={10}
              style={[styles.close, { backgroundColor: theme.backgroundElement }]}>
              <MaterialCommunityIcons name="close" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {vehicles.map((v) => {
              const selected = v.id === activeVehicle?.id;
              const month = monthByVehicle.get(v.id);
              return (
                <Pressable
                  key={v.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={vehicleTitle(v, lang)}
                  onPress={() => go(() => setActiveVehicleId(v.id))}
                  style={({ pressed }) => [
                    styles.card,
                    selected
                      ? { backgroundColor: theme.chipSelected, borderColor: theme.chipSelectedBorder }
                      : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && { opacity: 0.85 },
                  ]}>
                  <VehicleIcon vehicle={v} size={46} />
                  <View style={styles.main}>
                    <ThemedText numberOfLines={1} style={styles.name}>
                      {vehicleTitle(v, lang)}
                    </ThemedText>
                    <ThemedText numberOfLines={1} style={styles.sub} themeColor="textSecondary">
                      {vehicleSubtitle(v, t, lang)}
                    </ThemedText>
                    <View style={styles.tags}>
                      <View style={[styles.tag, { backgroundColor: theme.background }]}>
                        <MaterialCommunityIcons name="gas-station-outline" size={12} color={theme.icon} />
                        <ThemedText style={styles.tagText}>{t(`fuelTypes.${v.fuel_type}`)}</ThemedText>
                      </View>
                      {month != null && (
                        <View style={[styles.tag, { backgroundColor: theme.background }]}>
                          <MaterialCommunityIcons name="calendar-month-outline" size={12} color={theme.icon} />
                          <ThemedText style={styles.tagText}>
                            {t('switcher.thisMonth', { amount: formatMoney(month, currency, lang) })}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.side}>
                    <MaterialCommunityIcons
                      name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                      size={24}
                      color={selected ? theme.accent : theme.inputBorder}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('switcher.edit', { name: vehicleTitle(v, lang) })}
                      hitSlop={8}
                      onPress={() =>
                        go(() => router.push({ pathname: '/vehicles/[id]', params: { id: v.id } }))
                      }>
                      <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              onPress={() => go(() => router.push('/vehicles/new'))}
              style={({ pressed }) => [
                styles.card,
                styles.addCard,
                { borderColor: theme.inputBorder, opacity: pressed ? 0.8 : 1 },
              ]}>
              <View style={[styles.addIcon, { backgroundColor: theme.tint }]}>
                <MaterialCommunityIcons name="plus" size={22} color={theme.onTint} />
              </View>
              <View style={styles.main}>
                <ThemedText style={styles.name}>{t('vehicles.add')}</ThemedText>
                <ThemedText style={styles.sub} themeColor="textSecondary">
                  {t('switcher.addHint')}
                </ThemedText>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    alignSelf: 'center',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 8,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
  },
  sheetSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    position: 'absolute',
    bottom: -2,
    end: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 600,
  },
  sub: {
    fontSize: 12,
    lineHeight: 16,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 500,
  },
  side: {
    alignItems: 'center',
    gap: 14,
  },
  addCard: {
    borderStyle: 'dashed',
  },
  addIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
