import { PROJECT_CONFIG } from '../project.config';

export const CONFIG = {
  // Use VITE_BASE_URL if provided, else fall back to APP_URL or default
  baseUrl: (import.meta.env.VITE_BASE_URL || import.meta.env.APP_URL || PROJECT_CONFIG.defaultBaseUrl).replace(/\/$/, ''),
  // Ensure basePath starts and ends with / unless it's empty
  basePath: (import.meta.env.VITE_BASE_PATH || PROJECT_CONFIG.defaultBasePath).replace(/^\/?/, '/').replace(/\/?$/, '/'),
  repoOwner: PROJECT_CONFIG.repoOwner,
  repoName: PROJECT_CONFIG.repoName,
  language: 'fi',
  giscus: {
    repo: `${PROJECT_CONFIG.repoOwner}/${PROJECT_CONFIG.repoName}`,
    repoId: import.meta.env.VITE_GISCUS_REPO_ID || 'R_kgDOSWMhAA',
    category: import.meta.env.VITE_GISCUS_CATEGORY || 'Announcements',
    categoryId: import.meta.env.VITE_GISCUS_CATEGORY_ID || 'DIC_kwDOSWMhAM4C88or',
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
        { label: 'Kaavatietomalli', type: 'page', slug: 'kaavatietomalli-yalusta'},
        { label: 'Soveltamisohjeet', type: 'page', slug: 'soveltamisohjeet'},
        { label: 'Ryhti-järjestelmä', type: 'page', slug: 'ryhti-jarjestelma'},
        { label: 'Kaavatieto kuntajärjestelmissä', type: 'page', slug: 'kuntajarjestelmat'}
      ]
    },
    { 
        label: 'Ratkaisut',
        type: 'menu',
        subitems: [
            { label: 'Toimittajat ja ohjelmistot', type: 'tag', slug: 'toimittajat-ohjelmistot'},
            { label: 'Tietomallisparraukset ja koulutukset', type: 'page', slug: 'sparraus'},
            { label: 'Markkinaselvitykset', type: 'page', slug: 'markkinaselvitykset'}
        ]
    },
    { label: 'Kumppanit', type: 'page', slug: 'kumppanit' },
    { label: 'Tietoa', type: 'page', slug: 'tietoa' }
  ] as NavItem[],
  themes: [
    { id: 'lainsaadanto', label: 'Lainsäädäntö', tag: 'lainsäädäntö' },
    { id: 'tietomallit', label: 'Tietomallit', tag: 'tietomallit' },
    { id: 'kaavatietomalli-ng', label: 'Kaavatietomalli NG', tag: 'kaavatietomalli-ng' },
    { id: 'era-henki', label: 'ERA-henki', tag: 'era-henki' }
  ] as ThemeItem[]
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
