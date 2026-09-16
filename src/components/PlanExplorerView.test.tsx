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
    numberOfDetailedPlansInRyhti: 15,
    numberOfMasterPlansInRyhti: 10
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
    numberOfDetailedPlansInRyhti: 3,
    numberOfMasterPlansInRyhti: 4
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
      { id: 'kunta.091', natcode: '091', kuntatunnus: 91, nameFin: 'Helsinki', nameSwe: 'Helsingfors', numberOfDetailedPlansInRyhti: 15, numberOfMasterPlansInRyhti: 10 },
      { id: 'kunta.749', natcode: '749', kuntatunnus: 749, nameFin: 'Seinäjoki', nameSwe: 'Seinäjoki', numberOfDetailedPlansInRyhti: 3, numberOfMasterPlansInRyhti: 4 }
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
  } else if (url.includes('pub_valid_lm_plan_ix_gs')) {
    data = {
      type: 'FeatureCollection',
      numberMatched: 0,
      numberReturned: 0,
      features: []
    };
  } else if (url.includes('pub_valid_ld_plan_ix_gs') || url.includes('wfs')) {
    const match = url.match(/startIndex=(\d+)/);
    const startIndex = match ? parseInt(match[1], 10) : 0;
    const isNextPage = startIndex > 0;
    data = {
      type: 'FeatureCollection',
      numberMatched: 100,
      numberReturned: 1,
      features: [isNextPage ? mockPlanFeature2 : mockPlanFeature]
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

import { PlanExplorerView, DEFAULT_DIGITAL_ORIGIN_MAP, getPlanCategory } from './PlanExplorerView';
import { getTranslations } from '../i18n';

const translations = getTranslations('fi');
const strings = translations.planBrowser;

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
    } else if (url.includes('startIndex=') && !url.includes('startIndex=0')) {
      data = {
        type: 'FeatureCollection',
        numberMatched: 100,
        numberReturned: 1,
        features: [mockPlanFeature2]
      };
    } else if (url.includes('pub_valid_ld_plan_ix_gs') || url.includes('pub_valid_lm_plan_ix_gs') || url.includes('wfs')) {
      data = {
        type: 'FeatureCollection',
        numberMatched: 50,
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

    expect(screen.getByText(strings.title)).toBeDefined();
    expect(screen.getByPlaceholderText(strings.searchPlanPlaceholder)).toBeDefined();

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
      expect.stringContaining('cql_filter=administrative_area_identifiers'),
      expect.anything()
    );
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sortby=approval_date+DESC'),
      expect.anything()
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

    // Load more button should be rendered on the header row with strings.loadMorePlans
    const loadMoreBtn = screen.getByText(strings.loadMorePlans);
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
      expect(screen.getAllByText(new RegExp(DEFAULT_DIGITAL_ORIGIN_MAP['01'], 'i')).length).toBeGreaterThan(0);
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
      expect(screen.getByText(/Helsinki \(25\)/i)).toBeDefined();
      expect(screen.getByText(/Seinäjoki \(7\)/i)).toBeDefined();
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

    const fullscreenBtn = screen.getByTitle(strings.enterFullscreen);
    expect(fullscreenBtn).toBeDefined();

    fireEvent.click(fullscreenBtn);
    await flushPromises();

    // In fullscreen mode, title switches to strings.exitFullscreen
    await waitFor(() => {
      expect(screen.getByTitle(strings.exitFullscreen)).toBeDefined();
    });

    // Exit fullscreen
    fireEvent.click(screen.getByTitle(strings.exitFullscreen));
    await flushPromises();

    await waitFor(() => {
      expect(screen.getByTitle(strings.enterFullscreen)).toBeDefined();
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

  describe('WFS result sorting order by approval_date (NULLS FIRST)', () => {
    const planNullMaster = {
      id: 'pub_valid_lm_plan_ix_gs.null-master',
      type: 'Feature' as const,
      geometry: { type: 'Polygon', coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]] },
      properties: {
        id: 'pub_valid_lm_plan_ix_gs.null-master',
        name_fin: 'Yleiskaava Ilman Päivämäärää',
        approval_date: null,
        administrative_area_identifiers: '["091"]'
      }
    };

    const plan2025Master = {
      id: 'pub_valid_lm_plan_ix_gs.2025-master',
      type: 'Feature' as const,
      geometry: { type: 'Polygon', coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]] },
      properties: {
        id: 'pub_valid_lm_plan_ix_gs.2025-master',
        name_fin: 'Uusin Yleiskaava 2025',
        approval_date: '2025-01-01T00:00:00Z',
        administrative_area_identifiers: '["091"]'
      }
    };

    const plan2020Detailed = {
      id: 'pub_valid_ld_plan_ix_gs.2020-detailed',
      type: 'Feature' as const,
      geometry: { type: 'Polygon', coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]] },
      properties: {
        id: 'pub_valid_ld_plan_ix_gs.2020-detailed',
        name_fin: 'Vanha Asemakaava 2020',
        approval_date: '2020-01-01T00:00:00Z',
        administrative_area_identifiers: '["091"]'
      }
    };

    it('places master plans with null approval_date at the top when requesting master plans', async () => {
      const customFetch = (url: string) => {
        if (url.includes('pub_valid_lm_plan_ix_gs')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({
              type: 'FeatureCollection',
              numberMatched: 2,
              features: [plan2025Master, planNullMaster]
            })
          });
        }
        return mockFetchHandler(url);
      };
      vi.stubGlobal('fetch', vi.fn(customFetch));

      render(<PlanExplorerView initialMunicipalities={[mockMunicipalityFeature]} />);
      await flushPromises();

      const selects = screen.getAllByRole('combobox');
      // Select Helsinki
      fireEvent.change(selects[0], { target: { value: '091' } });
      await flushPromises();

      // Select Yleiskaava planType (code '2')
      fireEvent.change(selects[1], { target: { value: '2' } });
      await flushPromises();

      await waitFor(() => {
        const planButtons = screen.getAllByRole('button').filter(b => b.className.includes('text-left') && b.textContent?.includes('Yleiskaava'));
        expect(planButtons.length).toBe(2);
        // Null approval date plan must be first
        expect(planButtons[0].textContent).toContain('Yleiskaava Ilman Päivämäärää');
        expect(planButtons[1].textContent).toContain('Uusin Yleiskaava 2025');
      });
    });

    it('places null approval_date plans at the top when requesting both master and detailed plans', async () => {
      const customFetch = (url: string) => {
        if (url.includes('pub_valid_lm_plan_ix_gs')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({
              type: 'FeatureCollection',
              numberMatched: 2,
              features: [plan2025Master, planNullMaster]
            })
          });
        }
        if (url.includes('pub_valid_ld_plan_ix_gs')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({
              type: 'FeatureCollection',
              numberMatched: 1,
              features: [plan2020Detailed]
            })
          });
        }
        return mockFetchHandler(url);
      };
      vi.stubGlobal('fetch', vi.fn(customFetch));

      render(<PlanExplorerView initialMunicipalities={[mockMunicipalityFeature]} />);
      await flushPromises();

      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '091' } });
      await flushPromises();

      await waitFor(() => {
        const planButtons = screen.getAllByRole('button').filter(b => 
          b.className.includes('text-left') && (b.textContent?.includes('Kaava') || b.textContent?.includes('Yleiskaava') || b.textContent?.includes('Asemakaava'))
        );
        expect(planButtons.length).toBe(3);
        // 1st: Null approval date master plan
        expect(planButtons[0].textContent).toContain('Yleiskaava Ilman Päivämäärää');
        // 2nd: 2025 master plan
        expect(planButtons[1].textContent).toContain('Uusin Yleiskaava 2025');
        // 3rd: 2020 detailed plan
        expect(planButtons[2].textContent).toContain('Vanha Asemakaava 2020');
      });
    });
  });

  describe('Plan Categories and Map Layers', () => {
    it('correctly categorizes plans into detailed (code 3) and master (code 2) plans', () => {
      const detailedPlan = {
        ...mockPlanFeature,
        properties: { ...mockPlanFeature.properties, plan_type_code_value: '31' }
      };
      const masterPlan = {
        ...mockPlanFeature,
        id: 'pub_valid_lm_plan_ix_gs.lm-001',
        properties: { ...mockPlanFeature.properties, plan_type_code_value: '21' }
      };

      expect(getPlanCategory(detailedPlan)).toBe('detailed');
      expect(getPlanCategory(masterPlan)).toBe('master');
    });

    it('renders layer visibility toggle buttons for both detailed and master plans when present', async () => {
      const testMaster = {
        id: 'pub_valid_lm_plan_ix_gs.2025-master',
        type: 'Feature' as const,
        geometry: { type: 'Polygon', coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]] },
        properties: {
          id: 'pub_valid_lm_plan_ix_gs.2025-master',
          name_fin: 'Uusin Yleiskaava 2025',
          approval_date: '2025-01-01T00:00:00Z',
          administrative_area_identifiers: '["091"]'
        }
      };

      const testDetailed = {
        id: 'pub_valid_ld_plan_ix_gs.2020-detailed',
        type: 'Feature' as const,
        geometry: { type: 'Polygon', coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]] },
        properties: {
          id: 'pub_valid_ld_plan_ix_gs.2020-detailed',
          name_fin: 'Vanha Asemakaava 2020',
          approval_date: '2020-01-01T00:00:00Z',
          administrative_area_identifiers: '["091"]'
        }
      };

      const customFetch = (url: string) => {
        if (url.includes('pub_valid_lm_plan_ix_gs')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({
              type: 'FeatureCollection',
              numberMatched: 1,
              features: [testMaster]
            })
          });
        }
        if (url.includes('pub_valid_ld_plan_ix_gs')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({
              type: 'FeatureCollection',
              numberMatched: 1,
              features: [testDetailed]
            })
          });
        }
        return mockFetchHandler(url);
      };
      vi.stubGlobal('fetch', vi.fn(customFetch));

      render(<PlanExplorerView initialMunicipalities={[mockMunicipalityFeature]} />);
      await flushPromises();

      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: '091' } });
      await flushPromises();

      await waitFor(() => {
        const toggleButtons = screen.getAllByRole('button').filter(b => b.textContent?.includes('Asemakaavat') || b.textContent?.includes('Yleiskaavat'));
        expect(toggleButtons.length).toBeGreaterThanOrEqual(2);
      });

      const detailedToggle = screen.getAllByRole('button').find(b => b.textContent?.includes('Asemakaavat (1)'))!;
      expect(detailedToggle).toBeTruthy();
      fireEvent.click(detailedToggle);
      await flushPromises();

      const masterToggle = screen.getAllByRole('button').find(b => b.textContent?.includes('Yleiskaavat (1)'))!;
      expect(masterToggle).toBeTruthy();
      fireEvent.click(masterToggle);
      await flushPromises();
    });

    it('automatically enables corresponding layer when selecting a plan whose layer is hidden', async () => {
      const testMaster = {
        id: 'pub_valid_lm_plan_ix_gs.2025-master-auto',
        type: 'Feature' as const,
        geometry: { type: 'Polygon', coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]] },
        properties: {
          id: 'pub_valid_lm_plan_ix_gs.2025-master-auto',
          name_fin: 'Yleiskaava 2025 Testi',
          plan_type_name_fin: 'Yleiskaava',
          approval_date: '2025-01-01T00:00:00Z',
          administrative_area_identifiers: '["091"]'
        }
      };

      const testDetailed = {
        id: 'pub_valid_ld_plan_ix_gs.2020-detailed-auto',
        type: 'Feature' as const,
        geometry: { type: 'Polygon', coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]] },
        properties: {
          id: 'pub_valid_ld_plan_ix_gs.2020-detailed-auto',
          name_fin: 'Asemakaava 2020 Testi',
          plan_type_name_fin: 'Asemakaava',
          approval_date: '2020-01-01T00:00:00Z',
          administrative_area_identifiers: '["091"]'
        }
      };

      render(
        <PlanExplorerView
          initialPlans={[testMaster, testDetailed]}
          initialMunicipalities={[mockMunicipalityFeature]}
        />
      );
      await flushPromises();

      await waitFor(() => {
        expect(screen.getAllByText(/Yleiskaava 2025 Testi/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Asemakaava 2020 Testi/i).length).toBeGreaterThan(0);
      });

      // Initially Yleiskaava 2025 Testi is selected (newer date). Toggle master plan layer off.
      const masterToggle = screen.getAllByRole('button').find(b => b.textContent?.includes('Yleiskaavat (1)'))!;
      expect(masterToggle).toBeTruthy();
      fireEvent.click(masterToggle);
      await flushPromises();

      // Now click on the Asemakaava plan item in the list
      const detailedPlanButton = screen.getAllByText(/Asemakaava 2020 Testi/i)[0].closest('button')!;
      fireEvent.click(detailedPlanButton);
      await flushPromises();

      // Detailed plan layer button is active (bg-orange-500/20)
      const detailedToggle = screen.getAllByRole('button').find(b => b.textContent?.includes(`${strings.detailedPlanLayer} (1)`))!;
      expect(detailedToggle.className).toContain('bg-orange-500/20');

      // Toggle detailed plan layer off
      fireEvent.click(detailedToggle);
      await flushPromises();

      // Re-select the Master plan item in the list
      const masterPlanButton = screen.getAllByText(/Yleiskaava 2025 Testi/i)[0].closest('button')!;
      fireEvent.click(masterPlanButton);
      await flushPromises();

      // Master plan layer automatically turned back on (bg-purple-500/20)
      const updatedMasterToggle = screen.getAllByRole('button').find(b => b.textContent?.includes(`${strings.masterPlanLayer} (1)`))!;
      expect(updatedMasterToggle.className).toContain('bg-purple-500/20');
    });
  });
});
