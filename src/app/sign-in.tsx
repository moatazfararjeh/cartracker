import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/language-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Mode = 'signIn' | 'signUp';

export default function SignInScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  async function submit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('auth.missingFields'));
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { full_name: fullName.trim() || null } },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        // Email confirmation is required before the first sign-in.
        setNotice(t('auth.checkEmail'));
        setMode('signIn');
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) setError(signInError.message);
    }

    setLoading(false);
  }

  function toggleMode() {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError(null);
    setNotice(null);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <LanguageSwitch />

            <View style={styles.header}>
              <ThemedText type="subtitle">{t('common.appName')}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {isSignUp ? t('auth.signUpTitle') : t('auth.signInTitle')}
              </ThemedText>
            </View>

            <View style={styles.form}>
              {isSignUp && (
                <TextField
                  label={t('auth.fullName')}
                  value={fullName}
                  onChangeText={setFullName}
                  autoComplete="name"
                  textContentType="name"
                />
              )}
              <TextField
                label={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <TextField
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                textContentType={isSignUp ? 'newPassword' : 'password'}
                onSubmitEditing={submit}
              />

              {error && <ThemedText themeColor="danger">{error}</ThemedText>}
              {notice && <ThemedText themeColor="tint">{notice}</ThemedText>}

              <Button
                title={isSignUp ? t('auth.signUp') : t('auth.signIn')}
                loading={loading}
                onPress={submit}
              />
            </View>

            <Pressable accessibilityRole="button" onPress={toggleMode} style={styles.toggle}>
              <ThemedText type="small" themeColor="tint">
                {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth / 1.5,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  form: {
    gap: Spacing.three,
  },
  toggle: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
});
