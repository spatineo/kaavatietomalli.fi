declare module '@yongsk0066/voikko' {
  import type { Voikko as VoikkoClass, VoikkoGrammarError as GrammarErr } from '@yongsk0066/voikko/dist/index.d.mts';

  // Export the static class type directly to preserve static methods (like init())
  export const Voikko: typeof VoikkoClass;
  export type Voikko = VoikkoClass;
  export type VoikkoGrammarError = GrammarErr;

  const defaultExport: {
    Voikko: typeof VoikkoClass;
  };
  export default defaultExport;
}