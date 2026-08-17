import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { AppLanguage, TranslationKey, TranslationVars, languageTags, translate } from '@/constants/i18n';

export type Translator = (key: TranslationKey, vars?: TranslationVars) => string;

/**
 * Screen-level translation helper. AppContext mirrors the current native app/device
 * language, so unsupported languages fall back to English without an in-app picker.
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
