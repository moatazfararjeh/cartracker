import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LanguageSwitch } from '@/components/language-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ScreenMaxWidth } from '@/constants/theme';
import { vehicleSubtitle, vehicleTitle } from '@/features/vehicles/display';
import { useTheme } from '@/hooks/use-theme';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';
import { useSession } from '@/providers/session-provider';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { session, signOut } = useSession();
  const { vehicles } = useActiveVehicle();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.section}>
          <ThemedText style={[styles.heading, { color: theme.eyebrow }]}>
            {t('settings.vehicles')}
          </ThemedText>
          {vehicles.map((v) => (
            <View
              key={v.id}
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>{vehicleTitle(v, i18n.language)}</ThemedText>
              <ThemedText style={styles.cardSub} themeColor="textSecondary">
                {vehicleSubtitle(v, t, i18n.language)}
              </ThemedText>
            </View>
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
