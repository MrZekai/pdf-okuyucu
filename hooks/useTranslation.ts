import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { AppLanguage, TranslationKey, TranslationVars, languageTags, translate } from '@/constants/i18n';

export type Translator = (key: TranslationKey, vars?: TranslationVars) => string;

/**
 * Screen-level translation helper. The active language lives in AppContext settings,
 * so switching it in Ayarlar / Settings / Ajustes re-renders every screen instantly.
 */
export function useTranslation() {
  const { settings } = useApp();
  const language: AppLanguage = settings.language;

  return useMemo(
    () => ({
      language,
      locale: languageTags[language],
      t: ((key, vars) => translate(language, key, vars)) as Translator
    }),
    [language]
  );
}
