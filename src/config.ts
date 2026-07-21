import { PROJECT_CONFIG } from '../project.config';

const env = (typeof import.meta !== 'undefined' && import.meta.env)
  || (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;

export const CONFIG = {
  // Prelaunch status (active if VITE_PRELAUNCH_PASSWORD is set and non-empty)
  prelaunch: !!env.VITE_PRELAUNCH_PASSWORD,
  // Use VITE_BASE_URL if provided, else fall back to APP_URL or default
  baseUrl: (env.VITE_BASE_URL || env.APP_URL || PROJECT_CONFIG.defaultBaseUrl).replace(/\/$/, ''),
  // Ensure basePath starts and ends with / unless it's empty
  basePath: (env.VITE_BASE_PATH || PROJECT_CONFIG.defaultBasePath).replace(/^\/?/, '/').replace(/\/?$/, '/'),
  repoOwner: PROJECT_CONFIG.repoOwner,
  repoName: PROJECT_CONFIG.repoName,
  language: 'fi',
  giscus: {
    repo: `${PROJECT_CONFIG.repoOwner}/${PROJECT_CONFIG.repoName}`,
    repoId: env.VITE_GISCUS_REPO_ID || 'R_kgDOSWMhAA',
    category: env.VITE_GISCUS_CATEGORY || 'Announcements',
    categoryId: env.VITE_GISCUS_CATEGORY_ID || 'DIC_kwDOSWMhAM4C88or',
    mapping: 'specific',
    strict: '1',
    reactionsEnabled: '1',
    emitMetadata: '0',
    inputPosition: 'bottom',
    theme: 'transparent_dark',
    lang: 'en',
    loading: 'lazy'
  },
  nav: [
    { label: 'Blogi', type: 'blog' },
    { 
      label: 'Yhteentoimivuus', 
      type: 'menu',
      subitems: [
        { label: 'Lait ja asetukset', type: 'page', slug: 'lainsaadanto'},
        { label: 'Kansallinen kaavatietomalli', type: 'page', slug: 'kaavatietomalli-yalusta'},
        { label: 'Soveltamisohjeet', type: 'page', slug: 'soveltamisohjeet'},
        { label: 'Ryhti-järjestelmä', type: 'page', slug: 'ryhti-jarjestelma'},
        { label: 'Kaavatieto kuntajärjestelmissä', type: 'page', slug: 'kuntajarjestelmat'}
      ]
    },
    { 
        label: 'Ratkaisut',
        type: 'menu',
        subitems: [
            { label: 'Ohjelmistot', type: 'tag', slug: 'ohjelmistot'},
            { label: 'Tietomallisparraukset ja koulutukset', type: 'tag', slug: 'sparraus'},
            { label: 'Markkinaselvitykset', type: 'tag', slug: 'markkinaselvitys'}
        ]
    },
    { 
        label: 'Kumppanit',
        type: 'menu',
        subitems: [
            { label: 'Spatineo Oy', type: 'page', slug: 'spatineo'}
        ]
    },
    { 
      label: 'Meistä',
      type: 'menu',
      subitems: [
        { label: 'Kaavatietomalli.fi', type: 'page', slug: 'tietoa'},
        { label: 'Toimituskunta', type: 'page', slug: 'toimituskunta'},
        { label: 'Palaute', type: 'page', slug: 'palaute'},
        { label: 'Tietosuoja', type: 'page', slug: 'tietosuoja'}
      ]
    }
  ] as NavItem[],
  themes: [
    { id: 'lainsaadanto', label: 'Lainsäädäntö', tag: 'lainsäädäntö' },
    { id: 'tietomallit', label: 'Tietomallit', tag: 'tietomallit' },
    { id: 'kehitysideat', label: 'Kehitysideat', tag: 'kehitysideat' },
    { id: 'yhteiskehittaminen', label: 'Yhteiskehittäminen', tag: 'yhteiskehittaminen' },
    { id: 'uusi-ajattelu', label: 'Uusi ajattelutapa', tag: 'uusi-ajattelu' },
    { id: 'kokemukset', label: 'Kokemukset', tag: 'kokemukset' }
  ] as ThemeItem[],
  analytics: {
    gaTrackingId: env.VITE_GA_TRACKING_ID || 'G-E9YTLR7C10'
  }
};

export interface ThemeItem {
  id: string;
  label: string;
  tag: string;
}

export interface NavItem {
  label?: string;
  type: 'page' | 'tag' | 'blog' | 'menu';
  slug?: string;
  subitems?: NavItem[];
}
