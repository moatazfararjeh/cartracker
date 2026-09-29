import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/blocks';
import { ThemedText } from '@/components/themed-text';
import { ScreenMaxWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS: { name: string; href: '/' | '/history' | '/add' | '/insights'; icon: IconName }[] = [
  { name: 'index', href: '/', icon: 'home-outline' },
  { name: 'history', href: '/history', icon: 'history' },
  { name: 'add', href: '/add', icon: 'plus-circle-outline' },
  { name: 'insights', href: '/insights', icon: 'chart-bar' },
];

const LABEL_KEYS: Record<string, string> = {
  index: 'tabs.home',
  history: 'tabs.history',
  add: 'tabs.add',
  insights: 'tabs.insights',
};

/** Bottom navigation bar matching the phone design. */
export default function AppTabs() {
  const { t } = useTranslation();

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <NavBar>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton icon={tab.icon}>{t(LABEL_KEYS[tab.name]!)}</TabButton>
            </TabTrigger>
          ))}
        </NavBar>
      </TabList>
    </Tabs>
  );
}

// Triggers must stay direct children of the TabList element so the router can find them.
function NavBar({ children, style, ...props }: TabListProps) {
  const theme = useTheme();
  return (
    <View
      {...props}
      style={[styles.nav, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }, style]}>
      <View style={styles.navInner}>{children}</View>
    </View>
  );
}

function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon: IconName }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.tabInactive;

  return (
    <Pressable
      {...props}
      aria-current={isFocused ? 'page' : undefined}
      style={({ pressed }) => [
        styles.tab,
        isFocused && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <ThemedText style={[styles.label, { color }, isFocused && styles.labelActive]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  nav: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 5,
  },
  navInner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: ScreenMaxWidth,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    minHeight: 51,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
  },
  labelActive: {
    fontWeight: 600,
  },
});
