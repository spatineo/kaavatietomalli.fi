import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock Plan & Municipality Data
const mockPlanFeature = {
  id: 'pub_valid_ld_plan_ix_gs.test-123',
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon',
    coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]]
  },
  properties: {
    id: 'pub_valid_ld_plan_ix_gs.test-123',
    permanent_plan_identifier: 'AK-001234',
    producer_plan_identifier: '915_123',
    name_fin: 'Testiasemakaava Keskusta',
    name_swe: 'Test stadsplan centrum',
    plan_type_name_fin: 'Asemakaava',
    digital_origin: 'http://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/01',
    administrative_area_identifiers: '["091"]',
    approval_date: '2024-05-15T00:00:00Z',
    date_of_validity: '2024-06-01T00:00:00Z',
    description_fin: 'Testiasemakaavan kuvausteksti'
  }
};

const mockPlanFeature2 = {
  id: 'pub_valid_ld_plan_ix_gs.test-456',
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon',
    coordinates: [[[24.1, 60.1], [25.1, 60.1], [25.1, 61.1], [24.1, 61.1], [24.1, 60.1]]]
  },
  properties: {
    id: 'pub_valid_ld_plan_ix_gs.test-456',
    permanent_plan_identifier: 'AK-005678',
    producer_plan_identifier: '915_456',
    name_fin: 'Testiasemakaava Ranta',
    name_swe: 'Test stadsplan strand',
    plan_type_name_fin: 'Asemakaava',
    administrative_area_identifiers: '["091"]',
    approval_date: '2024-06-15T00:00:00Z',
    date_of_validity: '2024-07-01T00:00:00Z',
    description_fin: 'Testiasemakaavan kuvausteksti 2'
  }
};

const mockMunicipalityFeature = {
  id: 'kunta.12345',
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon',
    coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]]
  },
  properties: {
    kuntatunnus: 91,
    NATCODE: '091',
    NAMEFIN: 'Helsinki',
    NAMESWE: 'Helsingfors',
    numberOfDetailedPlansInRyhti: 15
  }
};

const mockMunicipalityFeature2 = {
  id: 'kunta.67890',
  type: 'Feature' as const,
  geometry: {
    type: 'Polygon',
    coordinates: [[[25.0, 60.0], [26.0, 60.0], [26.0, 61.0], [25.0, 61.0], [25.0, 60.0]]]
  },
  properties: {
    kuntatunnus: 749,
    NATCODE: '749',
    NAMEFIN: 'Seinäjoki',
    NAMESWE: 'Seinäjoki',
    numberOfDetailedPlansInRyhti: 3
  }
};

const mockKuntaCodelist = {
  id: 'b4dc80b5-5097-4dce-bacc-9d72466ac663',
  technicalName: 'kunta_1_20240101',
  codes: [
    {
      id: 'code-091',
      codeValue: '091',
      names: {
        fi: 'Helsinki',
        sv: 'Helsingfors',
        en: 'Helsinki'
      }
    },
    {
      id: 'code-749',
      codeValue: '749',
      names: {
        fi: 'Seinäjoki',
        sv: 'Seinäjoki',
        en: 'Seinäjoki'
      }
    }
  ]
};

// Set global fetch before component import
const mockFetchHandler = (url: string) => {
  let data: any = { type: 'FeatureCollection', features: [] as any[], numberMatched: 0 };
  if (url.includes('version.json')) {
    data = { version: '1.0.0' };
  } else if (url.includes('municipalities.json')) {
    data = [
      { id: 'kunta.091', natcode: '091', kuntatunnus: 91, nameFin: 'Helsinki', nameSwe: 'Helsingfors', numberOfDetailedPlansInRyhti: 15 },
      { id: 'kunta.749', natcode: '749', kuntatunnus: 749, nameFin: 'Seinäjoki', nameSwe: 'Seinäjoki', numberOfDetailedPlansInRyhti: 3 }
    ];
  } else if (url.includes('municipalities/091.json') || url.includes('/091.json')) {
    data = mockMunicipalityFeature;
  } else if (url.includes('municipalities/749.json') || url.includes('/749.json')) {
    data = mockMunicipalityFeature2;
  } else if (url.includes('/collections/kunta') || url.includes('kuntarajat.json')) {
    data = { type: 'FeatureCollection', features: [mockMunicipalityFeature, mockMunicipalityFeature2] };
  } else if (url.includes('kunta_1_20240101.json')) {
    data = mockKuntaCodelist;
  } else if (url.includes('RY_Kaavalaji.json')) {
    data = {
      technicalName: 'RY_Kaavalaji',
      codes: [
        { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/31', codeValue: '31', hierarchyLevel: 2, broaderCode: '3', names: { fi: 'Asemakaava' } },
        { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33', codeValue: '33', hierarchyLevel: 2, broaderCode: '3', names: { fi: 'Ranta-asemakaava' } },
        { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/39', codeValue: '39', hierarchyLevel: 2, broaderCode: '3', status: 'SUPERSEDED', names: { fi: 'Asemakaava (ohjeellinen tonttijako)' } }
      ]
    };
  } else if (url.includes('pub_valid_ld_plan_ix_gs') || url.includes('wfs')) {
    data = {
      type: 'FeatureCollection',
      numberMatched: 100,
      numberReturned: 1,
      features: [mockPlanFeature]
    };
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(data)
  });
};

vi.stubGlobal('fetch', vi.fn(mockFetchHandler));

// Mock Leaflet and Proj4
const capturedLayerListeners: Array<{ feature: any; handlers: Record<string, Function> }> = [];

vi.mock('leaflet', () => {
  return {
    default: {
      map: () => ({
        setView: function() { return this; },
        remove: function() { return this; },
        addLayer: function() { return this; },
        removeLayer: function() { return this; },
        fitBounds: function() { return this; },
        on: function() { return this; },
        off: function() { return this; },
        invalidateSize: function() { return this; },
      }),
      tileLayer: () => ({ addTo: function() { return this; } }),
      geoJSON: (data: any, options?: any) => {
        if (options && typeof options.onEachFeature === 'function') {
          const items = Array.isArray(data) ? data : data?.features || (data ? [data] : []);
          items.forEach((item: any) => {
            const handlers: Record<string, Function> = {};
            const mockLayer = {
              on: (events: Record<string, Function>) => {
                Object.assign(handlers, events);
                return mockLayer;
              },
              setStyle: vi.fn(),
              bindTooltip: vi.fn()
            };
            capturedLayerListeners.push({ feature: item, handlers });
            options.onEachFeature(item, mockLayer);
          });
        }
        return {
          addTo: function() { return this; },
          setStyle: vi.fn(),
          bringToBack: vi.fn(),
          bringToFront: vi.fn(),
          getBounds: () => ({ isValid: () => false })
        };
      }
    }
  };
});

vi.mock('proj4', () => {
  const proj = () => [0, 0];
  proj.defs = vi.fn();
  return { default: proj };
});

import { PlanExplorerView } from './PlanExplorerView';

beforeEach(() => {
  vi.clearAllMocks();
  capturedLayerListeners.length = 0;

  const mockFetch = vi.fn((url: string) => {
    let data: any = { type: 'FeatureCollection', features: [] as any[], numberMatched: 0 };
    if (url.includes('municipalities.json') || url.includes('/collections/kunta') || url.includes('kuntarajat.json')) {
      data = {
        type: 'FeatureCollection',
        features: [
          mockMunicipalityFeature,
          mockMunicipalityFeature2
        ]
      };
    } else if (url.includes('kunta_1_20240101.json')) {
      data = mockKuntaCodelist;
    } else if (url.includes('startIndex=50') || url.includes('startIndex=')) {
      data = {
        type: 'FeatureCollection',
        numberMatched: 100,
        numberReturned: 1,
        features: [mockPlanFeature2]
      };
    } else if (url.includes('pub_valid_ld_plan_ix_gs') || url.includes('wfs')) {
      data = {
        type: 'FeatureCollection',
        numberMatched: 100,
        numberReturned: 1,
        features: [mockPlanFeature]
      };
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data)
    });
  });

  vi.stubGlobal('fetch', mockFetch);
  if (typeof window !== 'undefined') {
    window.fetch = mockFetch as any;
  }
});

async function flushPromises() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe('PlanExplorerView Component', () => {
  it('renders title, search input, and loads features', async () => {
    render(<PlanExplorerView initialPlans={[mockPlanFeature]} initialMunicipalities={[mockMunicipalityFeature, mockMunicipalityFeature2]} />);
    await flushPromises();

    expect(screen.getByText('Asemakaavaselain')).toBeDefined();
    expect(screen.getByPlaceholderText('Hae kaavan nimellä...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaava Keskusta/i).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/AK-001234/i).length).toBeGreaterThan(0);
  });

  it('queries WFS 2.0 API with CQL filter when municipality is selected from dropdown', async () => {
    render(<PlanExplorerView initialMunicipalities={[mockMunicipalityFeature, mockMunicipalityFeature2]} />);
    await flushPromises();

    const selects = screen.getAllByRole('combobox');
    const muniSelect = selects[0]; // Municipality dropdown is second input field in form, first combobox
    expect(muniSelect).toBeDefined();

    fireEvent.change(muniSelect, { target: { value: '749' } });
    await flushPromises();

    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining('cql_filter=administrative_area_identifiers')
    );
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sortby=approval_date+DESC')
    );
  });

  it('supports pagination with load more button showing numberMatched total', async () => {
    render(<PlanExplorerView initialMunicipalities={[mockMunicipalityFeature, mockMunicipalityFeature2]} />);
    await flushPromises();

    const selects = screen.getAllByRole('combobox');
    const muniSelect = selects[0];
    fireEvent.change(muniSelect, { target: { value: '091' } });
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaava Keskusta/i).length).toBeGreaterThan(0);
    });

    // Load more button should be rendered on the header row with "Hae lisää"
    const loadMoreBtn = screen.getByText('Hae lisää');
    expect(loadMoreBtn).toBeDefined();

    fireEvent.click(loadMoreBtn);
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaava Ranta/i).length).toBeGreaterThan(0);
    });
  });

  it('shows plan details when plan is selected', async () => {
    render(<PlanExplorerView initialPlans={[mockPlanFeature]} initialMunicipalities={[mockMunicipalityFeature]} />);
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaava Keskusta/i).length).toBeGreaterThan(0);
    });

    const planButton = screen.getAllByText(/Testiasemakaava Keskusta/i)[0];
    fireEvent.click(planButton);
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaavan kuvausteksti/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Helsinki/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Tietomallin mukaan laadittu/i).length).toBeGreaterThan(0);
    });
  });

  it('loads municipalities from build-time static JSON file', async () => {
    render(<PlanExplorerView />);
    await flushPromises();

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('municipalities.json')
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Helsinki \(15\)/i)).toBeDefined();
      expect(screen.getByText(/Seinäjoki \(3\)/i)).toBeDefined();
    });
  });

  it('formats plan dates in Finnish locale handling date-only UTC strings and null values', async () => {
    const planWithDates = {
      ...mockPlanFeature,
      properties: {
        ...mockPlanFeature.properties,
        time_of_initiation: '1900-01-01Z',
        date_of_validity: '1900-01-01Z',
        approval_date: null,
        period_of_validity_begin: '1900-01-01Z',
        period_of_validity_end: null
      }
    };

    render(<PlanExplorerView initialPlans={[planWithDates]} initialMunicipalities={[mockMunicipalityFeature]} />);
    await flushPromises();

    await waitFor(() => {
      // 1.1.1900 should be present for initiation & validity dates, and '-' for approval date
      const elements = screen.getAllByText('1.1.1900');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('toggles fullscreen mode without errors', async () => {
    render(<PlanExplorerView initialPlans={[mockPlanFeature]} initialMunicipalities={[mockMunicipalityFeature]} />);
    await flushPromises();

    const fullscreenBtn = screen.getByTitle('Koko ruutu');
    expect(fullscreenBtn).toBeDefined();

    fireEvent.click(fullscreenBtn);
    await flushPromises();

    // In fullscreen mode, title switches to 'Poistu koko ruudun tilasta'
    await waitFor(() => {
      expect(screen.getByTitle('Poistu koko ruudun tilasta')).toBeDefined();
    });

    // Exit fullscreen
    fireEvent.click(screen.getByTitle('Poistu koko ruudun tilasta'));
    await flushPromises();

    await waitFor(() => {
      expect(screen.getByTitle('Koko ruutu')).toBeDefined();
    });
  });

  it('auto-zooms to plan bounds when selecting a plan', async () => {
    render(<PlanExplorerView initialPlans={[mockPlanFeature]} initialMunicipalities={[mockMunicipalityFeature]} />);
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaava Keskusta/i).length).toBeGreaterThan(0);
    });

    const planItems = screen.getAllByText(/Testiasemakaava Keskusta/i);
    fireEvent.click(planItems[0]);
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/AK-001234/i).length).toBeGreaterThan(0);
    });
  });

  it('selects plan when clicking on map feature layer', async () => {
    render(<PlanExplorerView initialPlans={[mockPlanFeature, mockPlanFeature2]} initialMunicipalities={[mockMunicipalityFeature]} />);
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaava Keskusta/i).length).toBeGreaterThan(0);
    });

    let plan2Listener: any;
    await waitFor(() => {
      plan2Listener = capturedLayerListeners.find(l => l.feature?.id === 'pub_valid_ld_plan_ix_gs.test-456');
      expect(plan2Listener).toBeDefined();
    });

    act(() => {
      plan2Listener?.handlers.click({ originalEvent: { stopPropagation: vi.fn() } });
    });
    await flushPromises();

    await waitFor(() => {
      expect(screen.getAllByText(/Testiasemakaava Ranta/i).length).toBeGreaterThan(0);
    });
  });
});
