import '@/lib/local-storage';

import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DevSettings, I18nManager, Platform } from 'react-native';

import { ar } from './locales/ar';
import { en } from './locales/en';

export type Language = 'ar' | 'en';

const STORAGE_KEY = 'car-tracker.language';

function readStoredLanguage(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'ar' || value === 'en' ? value : null;
  } catch {
    return null;
  }
}

function detectLanguage(): Language {
  return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
}

export const initialLanguage: Language = readStoredLanguage() ?? detectLanguage();

export function isRTL(language: Language) {
  return language === 'ar';
}

// Native layout direction is fixed at startup, so align it with the chosen language.
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTL(initialLanguage));
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Persists the language; reloads the app when the layout direction must flip. */
export async function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not persisted; the choice still applies for this session.
  }
  await i18n.changeLanguage(language);

  if (Platform.OS === 'web' || I18nManager.isRTL === isRTL(language)) return;

  I18nManager.forceRTL(isRTL(language));
  if (__DEV__) {
    DevSettings.reload();
  } else {
    await Updates.reloadAsync();
  }
}

export default i18n;
