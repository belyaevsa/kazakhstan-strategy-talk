// Simple i18n implementation for Kazakhstan IT Strategy
// Supports Russian (default), English, and Kazakh

import ruTranslations from '@/locales/ru.json';
import enTranslations from '@/locales/en.json';
import kkTranslations from '@/locales/kk.json';

export type Language = 'ru' | 'en' | 'kk';

export interface Translations {
  [key: string]: string | Translations;
}

// Translation dictionary loaded from JSON files
const translations: Record<Language, Translations> = {
  ru: ruTranslations,
  en: enTranslations,
  kk: kkTranslations,
};

// Get translation by key with optional parameter substitution
export function t(key: string, params?: Record<string, string | number>, lang?: Language): string {
  const currentLang = lang || getCurrentLanguage();
  const keys = key.split('.');
  let value: any = translations[currentLang];

  for (const k of keys) {
    value = value?.[k];
  }

  if (typeof value !== 'string') {
    console.warn(`Translation key "${key}" not found for language "${currentLang}"`);
    return key;
  }

  // Replace parameters in the string
  if (params) {
    const result = value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      const replacement = params[paramKey];
      if (replacement !== undefined && replacement !== null) {
        return replacement.toString();
      }
      return match;
    });
    return result;
  }

  return value;
}

// Get current language from localStorage or user preference
export function getCurrentLanguage(): Language {
  // First check localStorage
  const stored = localStorage.getItem('language');
  if (stored && (stored === 'ru' || stored === 'en' || stored === 'kk')) {
    return stored as Language;
  }

  // Default to Russian
  return 'ru';
}

// Set language preference
export function setLanguage(lang: Language): void {
  localStorage.setItem('language', lang);
  window.dispatchEvent(new Event('languagechange'));
}

// Get language name in its own language
export function getLanguageName(lang: Language): string {
  const names: Record<Language, string> = {
    ru: 'Русский',
    en: 'English',
    kk: 'Қазақша',
  };
  return names[lang];
}
