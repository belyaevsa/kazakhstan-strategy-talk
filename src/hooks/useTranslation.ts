import { useState, useEffect } from 'react';
import { t as translate, getCurrentLanguage, setLanguage as setLang, Language } from '@/lib/i18n';
import { authService } from '@/services/authService';

export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    // Initialize language from user preference or localStorage
    const user = authService.getUser();
    if (user?.language && (user.language === 'ru' || user.language === 'en' || user.language === 'kk')) {
      setLang(user.language as Language);
      setLanguageState(user.language as Language);
    }

    // Listen for language changes
    const handleLanguageChange = () => {
      setLanguageState(getCurrentLanguage());
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, []);

  const t = (key: string, params?: Record<string, string | number>) => {
    return translate(key, params, language);
  };

  const setLanguage = (lang: Language) => {
    setLang(lang);
    setLanguageState(lang);
  };

  return { t, language, setLanguage };
}
