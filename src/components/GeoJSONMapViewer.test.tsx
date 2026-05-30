/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeoJsonMapViewer } from './GeoJSONMapViewer';
import { getTranslations } from '../i18n';

const t = getTranslations();

// Mock Leaflet and Proj4 imports to simulate dynamic loading failure for fallback test
vi.mock('leaflet', () => {
  throw new Error('Leaflet mock loading error for fallback test');
});

vi.mock('proj4', () => {
  throw new Error('Proj4 mock loading error for fallback test');
});

// Since LazySyntaxHighlighter is used, we'll mock it simply
vi.mock('./LazySyntaxHighlighter', () => {
  return {
    LazySyntaxHighlighter: ({ children }: any) => <pre data-testid="mock-syntax-highlighter">{children}</pre>,
  };
});

describe('GeoJsonMapViewer component', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders visual fallback with correct test id, readable text, and a functional download link when dynamic library loading fails', async () => {
    const validGeoJson = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [24.94, 60.17],
          },
          properties: {
            name: 'Helsinki',
          },
        },
      ],
    });

    render(<GeoJsonMapViewer code={validGeoJson} />);

    // Because map libraries fail to load (via our throwing mock),
    // it should fall back to the geojson-map-viewer-fallback element.
    await waitFor(() => {
      expect(screen.getByTestId('geojson-map-viewer-fallback')).toBeDefined();
    });

    const fallback = screen.getByTestId('geojson-map-viewer-fallback');
    expect(fallback.textContent).toContain('Error:');
    expect(fallback.textContent).toContain('map visualization is unavailable');
    expect(fallback.textContent).toContain(t.geojson.interactiveMapBlock);

    // Verify download link exists and is correctly configured
    const downloadLink = screen.getByTestId('geojson-download-link');
    expect(downloadLink).toBeDefined();
    expect(downloadLink.getAttribute('download')).toBe('map-data.geojson');
    expect(downloadLink.getAttribute('href')).toContain(encodeURIComponent(validGeoJson));
  });

  it('renders parsing error banner and forces code view when invalid GeoJSON is provided', async () => {
    const invalidJson = '{ invalid: json ';

    render(<GeoJsonMapViewer code={invalidJson} />);

    // The parsing error should be visible
    await waitFor(() => {
      expect(screen.getByText(new RegExp(t.geojson.jsonParseError, 'i'))).toBeDefined();
    });

    // Code highligher should render the invalid input in code tab
    expect(screen.getByTestId('mock-syntax-highlighter')).toBeDefined();
    expect(screen.getByTestId('mock-syntax-highlighter').textContent).toBe(invalidJson);
  });

  it('allows user to toggle to code tab manually', async () => {
    const validGeoJson = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
    });

    render(<GeoJsonMapViewer code={validGeoJson} />);

    // Click on Code tab button
    const codeTabButton = screen.getByRole('button', { name: new RegExp(t.geojson.codeTab, 'i') });
    expect(codeTabButton).toBeDefined();

    fireEvent.click(codeTabButton);

    // Code tab content should be rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-syntax-highlighter')).toBeDefined();
    });
    expect(screen.getByTestId('mock-syntax-highlighter').textContent).toBe(validGeoJson);
  });

  it('maintains layout resilience when non-object, empty, or malformed JSON formats are fed into the viewer', async () => {
    // 1. Syntactically invalid JSON string -> produces a parsing error banner and forces code view
    const { unmount: unmount1 } = render(<GeoJsonMapViewer code="invalid: json" />);
    await waitFor(() => {
      expect(screen.getByText(new RegExp(t.geojson.jsonParseError, 'i'))).toBeDefined();
    });
    unmount1();

    // 2. Empty Object -> compiles fine as JSON, stays on map tab showing map fallback, allows manual toggle to code tab
    const { unmount: unmount2 } = render(<GeoJsonMapViewer code="{}" language="jsonfg" />);
    await waitFor(() => {
      expect(screen.getByTestId('geojson-map-viewer-fallback')).toBeDefined();
    });
    const codeTabButton2 = screen.getByRole('button', { name: new RegExp(t.geojson.codeTab, 'i') });
    fireEvent.click(codeTabButton2);
    await waitFor(() => {
      expect(screen.getByTestId('mock-syntax-highlighter')).toBeDefined();
    });
    expect(screen.getByTestId('mock-syntax-highlighter').textContent).toBe('{}');
    unmount2();

    // 3. FeatureCollection with empty representation
    const { unmount: unmount3 } = render(<GeoJsonMapViewer code='{"type": "FeatureCollection"}' />);
    await waitFor(() => {
      expect(screen.getByTestId('geojson-map-viewer-fallback')).toBeDefined();
    });
    const codeTabButton3 = screen.getByRole('button', { name: new RegExp(t.geojson.codeTab, 'i') });
    fireEvent.click(codeTabButton3);
    await waitFor(() => {
      expect(screen.getByTestId('mock-syntax-highlighter')).toBeDefined();
    });
    unmount3();
  });
});
