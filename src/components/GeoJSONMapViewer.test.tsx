/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeoJsonMapViewer } from './GeoJSONMapViewer';

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

  it('renders visual fallback with correct test id when dynamic library loading fails', async () => {
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
  });

  it('renders parsing error banner and forces code view when invalid GeoJSON is provided', async () => {
    const invalidJson = '{ invalid: json ';

    render(<GeoJsonMapViewer code={invalidJson} />);

    // The parsing error should be visible
    await waitFor(() => {
      expect(screen.getByText(/virhe/i)).toBeDefined();
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
    const codeTabButton = screen.getByRole('button', { name: /Koodi/i });
    expect(codeTabButton).toBeDefined();

    fireEvent.click(codeTabButton);

    // Code tab content should be rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-syntax-highlighter')).toBeDefined();
    });
    expect(screen.getByTestId('mock-syntax-highlighter').textContent).toBe(validGeoJson);
  });
});
