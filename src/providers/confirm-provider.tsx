import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createContext, use, useRef, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  /** Red confirm button and a warning icon, for actions that delete data. */
  destructive?: boolean;
};

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/** In-app confirmation dialog in the app's own style (instead of the system / browser alert). */
export function ConfirmProvider({ children }: PropsWithChildren) {
  const theme = useTheme();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm: Confirm = (next) =>
    new Promise<boolean>((resolve) => {
      resolver.current?.(false); // a newer dialog cancels any open one
      resolver.current = resolve;
      setOptions(next);
    });

  function close(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Modal
        visible={!!options}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={options?.cancelText}
            onPress={() => close(false)}
          />
          {options && (
            <View
              accessibilityViewIsModal
              accessibilityRole="alert"
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {options.destructive && (
                <View style={[styles.icon, { backgroundColor: theme.warningBackground }]}>
                  <MaterialCommunityIcons name="alert-outline" size={26} color={theme.danger} />
                </View>
              )}
              <ThemedText style={styles.title}>{options.title}</ThemedText>
              {!!options.message && (
                <ThemedText style={styles.message} themeColor="textSecondary">
                  {options.message}
                </ThemedText>
              )}
              <View style={styles.actions}>
                <Button
                  style={styles.action}
                  variant="secondary"
                  title={options.cancelText}
                  onPress={() => close(false)}
                />
                <Button
                  style={[
                    styles.action,
                    options.destructive && { backgroundColor: theme.danger, borderColor: theme.danger },
                  ]}
                  title={options.confirmText}
                  onPress={() => close(true)}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </ConfirmContext>
  );
}

/** Returns `confirm(options)`, resolving `true` when the user confirms. */
export function useConfirm() {
  const confirm = use(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return confirm;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    alignSelf: 'stretch',
  },
  action: {
    flex: 1,
  },
});
