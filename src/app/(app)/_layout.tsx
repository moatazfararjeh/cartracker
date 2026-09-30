import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';
import { ActiveVehicleProvider } from '@/providers/active-vehicle-provider';

export default function AppLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <ActiveVehicleProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="vehicles/new"
          options={{ presentation: 'modal', title: t('vehicles.addTitle') }}
        />
        <Stack.Screen name="settings" options={{ title: t('tabs.settings') }} />
        <Stack.Screen name="documents/[type]" />
        <Stack.Screen name="records/[kind]/[id]" />
        <Stack.Screen name="vehicles/[id]" />
        <Stack.Screen name="reminders" options={{ title: t('reminders.title') }} />
      </Stack>
    </ActiveVehicleProvider>
  );
}
