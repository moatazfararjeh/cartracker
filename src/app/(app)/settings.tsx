import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LanguageSwitch } from '@/components/language-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { ScreenMaxWidth } from '@/constants/theme';
import { useCurrency, useUpdateProfile } from '@/features/profile/api';
import { vehicleSubtitle, vehicleTitle } from '@/features/vehicles/display';
import { useTheme } from '@/hooks/use-theme';
import { CURRENCIES } from '@/lib/format';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';
import { useSession } from '@/providers/session-provider';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { session, signOut } = useSession();
  const { vehicles } = useActiveVehicle();
  const currency = useCurrency();
  const updateProfile = useUpdateProfile();
  const isArabic = i18n.language === 'ar';
  const currencyOptions = CURRENCIES.map((c) => ({
    value: c.code,
    label: `${isArabic ? c.nameAr : c.nameEn} (${isArabic ? c.ar : c.en})`,
    keywords: `${c.code} ${c.nameEn} ${c.nameAr}`,
  }));

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: theme.eyebrow }]}>
            {t('settings.vehicles')}
          </ThemedText>
          {vehicles.map((v) => (
            <Pressable
              key={v.id}
              accessibilityRole="button"
              accessibilityHint={t('vehicles.editTitle')}
              onPress={() => router.push({ pathname: '/vehicles/[id]', params: { id: v.id } })}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <View style={styles.cardMain}>
                <ThemedText style={styles.cardTitle}>{vehicleTitle(v, i18n.language)}</ThemedText>
                <ThemedText style={styles.cardSub} themeColor="textSecondary">
                  {vehicleSubtitle(v, t, i18n.language)}
                </ThemedText>
              </View>
              <ThemedText style={{ color: theme.accent }}>{t('common.edit')}</ThemedText>
            </Pressable>
          ))}
          <Button
            title={t('vehicles.add')}
            variant="secondary"
            onPress={() => router.push('/vehicles/new')}
          />
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: theme.eyebrow }]}>
            {t('settings.language')}
          </ThemedText>
          <LanguageSwitch />
        </View>

        <View style={styles.section}>
          <SelectField
            label={t('settings.currency')}
            placeholder={t('settings.currency')}
            options={currencyOptions}
            value={currency}
            onChange={(code) => updateProfile.mutate({ currency: code })}
            loading={updateProfile.isPending}
            searchable
          />
          {updateProfile.error && (
            <ThemedText themeColor="danger">{updateProfile.error.message}</ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: theme.eyebrow }]}>
            {t('settings.account')}
          </ThemedText>
          <ThemedText style={styles.cardTitle}>{session?.user.email}</ThemedText>
          <Button title={t('auth.signOut')} variant="danger" onPress={signOut} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: ScreenMaxWidth,
    alignSelf: 'center',
    padding: 20,
    gap: 28,
  },
  section: {
    gap: 10,
  },
  heading: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    fontWeight: 500,
  },
  card: {
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 500,
  },
  cardSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
});
