import { PROJECT_CONFIG } from '../project.config';

export const CONFIG = {
  // Use VITE_BASE_URL if provided, else fall back to APP_URL or default
  baseUrl: (import.meta.env.VITE_BASE_URL || import.meta.env.APP_URL || PROJECT_CONFIG.defaultBaseUrl).replace(/\/$/, ''),
  // Ensure basePath starts and ends with / unless it's empty
  basePath: (import.meta.env.VITE_BASE_PATH || PROJECT_CONFIG.defaultBasePath).replace(/^\/?/, '/').replace(/\/?$/, '/'),
  repoOwner: PROJECT_CONFIG.repoOwner,
  repoName: PROJECT_CONFIG.repoName,
  nav: [
    { label: 'Blogi', type: 'blog' },
    { label: 'Tietomallit', type: 'page', slug: 'tietomallit' },
    { label: 'Sparrausapua', type: 'page', slug: 'sparraus' },
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
  type: 'page' | 'tag' | 'blog';
  slug?: string;
}
