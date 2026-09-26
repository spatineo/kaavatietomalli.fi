/**
 * Basemap Configuration for Leaflet Map Components (PlanExplorerView & GeoJSONMapViewer)
 * Supports CARTO basemaps and Maanmittauslaitos (NLS.fi) WMTS raster basemaps.
 */

export type TileStyle =
  | 'dark'
  | 'light'
  | 'mml_taustakartta'
  | 'mml_maastokartta'
  | 'mml_selkokartta'
  | 'mml_ortokuva';

export interface BasemapConfig {
  key: TileStyle;
  label: string;
  provider: 'carto' | 'mml';
  isLight: boolean;
  url: string;
  attribution: string;
  maxZoom: number;
}

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY || '';
const KEY_PARAM = CARTO_KEY ? `?key=${CARTO_KEY}` : '';

// Resolve MML tiles base URL:
// In production, use dedicated map subdomain https://map.kaavatietomalli.fi/mml-tiles
// In local dev/preview environments, fall back to relative /mml-tiles proxied by Vite
const isLocalDevOrPreview = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.endsWith('.run.app')
);

export const MML_TILES_BASE_URL = import.meta.env.VITE_MML_TILES_BASE_URL || (
  isLocalDevOrPreview ? '/mml-wmts' : 'https://map.kaavatietomalli.fi/mml-wmts'
);

export const TILE_LAYERS: Record<TileStyle, BasemapConfig> = {
  dark: {
    key: 'dark',
    label: 'Carto Tumma',
    provider: 'carto',
    isLight: false,
    url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${KEY_PARAM}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
    maxZoom: 19
  },
  light: {
    key: 'light',
    label: 'Carto Vaalea',
    provider: 'carto',
    isLight: true,
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${KEY_PARAM}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
    maxZoom: 19
  },
  mml_taustakartta: {
    key: 'mml_taustakartta',
    label: 'MML Taustakartta',
    provider: 'mml',
    isLight: true,
    url: `${MML_TILES_BASE_URL}/1.0.0/taustakartta/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.png`,
    attribution: '&copy; <a href="https://www.maanmittauslaitos.fi" target="_blank">Maanmittauslaitos</a>',
    maxZoom: 18
  },
  mml_maastokartta: {
    key: 'mml_maastokartta',
    label: 'MML Maastokartta',
    provider: 'mml',
    isLight: true,
    url: `${MML_TILES_BASE_URL}/1.0.0/maastokartta/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.png`,
    attribution: '&copy; <a href="https://www.maanmittauslaitos.fi" target="_blank">Maanmittauslaitos</a>',
    maxZoom: 18
  },
  mml_selkokartta: {
    key: 'mml_selkokartta',
    label: 'MML Selkokartta',
    provider: 'mml',
    isLight: true,
    url: `${MML_TILES_BASE_URL}/1.0.0/selkokartta/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.png`,
    attribution: '&copy; <a href="https://www.maanmittauslaitos.fi" target="_blank">Maanmittauslaitos</a>',
    maxZoom: 18
  },
  mml_ortokuva: {
    key: 'mml_ortokuva',
    label: 'MML Ortokuva (ilmakuva)',
    provider: 'mml',
    isLight: false,
    url: `${MML_TILES_BASE_URL}/1.0.0/ortokuva/default/WGS84_Pseudo-Mercator/{z}/{y}/{x}.jpg`,
    attribution: '&copy; <a href="https://www.maanmittauslaitos.fi" target="_blank">Maanmittauslaitos</a>',
    maxZoom: 18
  }
};
