import { fi } from './fi';
import { Translations } from './types';

export type Language = 'fi';

const translations: Record<Language, Translations> = {
  fi,
};

export function getTranslations(lang: Language = 'fi'): Translations {
  return translations[lang] || translations.fi;
}
