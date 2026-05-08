import { PROJECT_CONFIG } from '../project.config';

export const CONFIG = {
  // Use VITE_BASE_URL if provided, else fall back to APP_URL or default
  baseUrl: (import.meta.env.VITE_BASE_URL || import.meta.env.APP_URL || PROJECT_CONFIG.defaultBaseUrl).replace(/\/$/, ''),
  // Ensure basePath starts and ends with / unless it's empty
  basePath: (import.meta.env.VITE_BASE_PATH || PROJECT_CONFIG.defaultBasePath).replace(/^\/?/, '/').replace(/\/?$/, '/'),
  repoOwner: PROJECT_CONFIG.repoOwner,
  repoName: PROJECT_CONFIG.repoName,
};
