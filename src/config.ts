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
  dataLanguages: [
    { code: 'fi', name: 'Suomi' },
    { code: 'sv', name: 'Svenska' },
    { code: 'en', name: 'English' }
  ],
  defaultDataLanguage: 'fi',
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
  analytics: {
    gaTrackingId: env.VITE_GA_TRACKING_ID || 'G-E9YTLR7C10'
  },
  remoteFetchOptions: {
    headers: {
      'User-Agent': 'Kaavatietomalli.fi/0.0.1 (https://kaavatietomalli.fi/page/palaute)',
    }
  }
};