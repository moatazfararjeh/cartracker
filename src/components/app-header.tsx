import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { VehicleIcon, VehicleSwitcher } from '@/components/vehicle-switcher';
import { ScreenMaxWidth } from '@/constants/theme';
import { useInitials } from '@/features/profile/api';
import { vehicleSubtitle, vehicleTitle } from '@/features/vehicles/display';
import { useTheme } from '@/hooks/use-theme';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

export function AppHeader() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const initials = useInitials();
  const { activeVehicle } = useActiveVehicle();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <View style={[styles.header, { backgroundColor: theme.header, paddingTop: insets.top + 25 }]}>
      <View style={styles.inner}>
        <ThemedText style={[styles.eyebrow, { color: theme.eyebrow }]}>
          {t('header.eyebrow')}
        </ThemedText>
        <View style={styles.topline}>
          <ThemedText style={styles.title}>{t('header.title')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('header.openSettings')}
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={[styles.avatar, { backgroundColor: theme.avatar }]}>
            <ThemedText style={styles.avatarText}>{initials}</ThemedText>
          </Pressable>
        </View>

        {activeVehicle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('header.switchVehicle')}
            onPress={() => setSwitcherOpen(true)}
            style={({ pressed }) => [
              styles.vehicle,
              {
                backgroundColor: theme.headerCard,
                borderColor: theme.headerCardBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <VehicleIcon vehicle={activeVehicle} />
            <View style={styles.vehicleMain}>
              <ThemedText numberOfLines={1} style={styles.vehicleName}>
                {vehicleTitle(activeVehicle, i18n.language)}
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.vehicleSub} themeColor="textSecondary">
                {vehicleSubtitle(activeVehicle, t, i18n.language)}
              </ThemedText>
            </View>
            <MaterialCommunityIcons name="unfold-more-horizontal" size={18} color={theme.text} />
          </Pressable>
        )}
      </View>

      <VehicleSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  inner: {
    width: '100%',
    maxWidth: ScreenMaxWidth,
    alignSelf: 'center',
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  topline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 5,
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: 500,
    flexShrink: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: 500,
  },
  vehicle: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleMain: {
    flex: 1,
    minWidth: 0,
  },
  vehicleName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 500,
  },
  vehicleSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
});
