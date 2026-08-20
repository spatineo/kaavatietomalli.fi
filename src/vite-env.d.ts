/// <reference types="vite/client" />

declare module 'mermaid/dist/mermaid.core.mjs' {
  import mermaid from 'mermaid';
  export default mermaid;
}

declare module '@yongsk0066/voikko' {
  export interface VoikkoGrammarError {
    code: number;
    startPos: number;
    errorLen: number;
    shortDescription?: string;
  }

  export class Voikko {
    /**
     * Initializes Voikko (Node.js auto-detects bundled dictionary)
     */
    static init(): Promise<Voikko>;

    spell(word: string): boolean;
    suggest(word: string): string[];
    grammarErrors(text: string): VoikkoGrammarError[];
  }
}