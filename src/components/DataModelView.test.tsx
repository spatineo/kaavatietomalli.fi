/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getTranslations } from '../i18n';

import { DataModelAccess } from '../lib/data-model-types';

const t = getTranslations();

const mockDataModelAccess: DataModelAccess = {
      getDataModel(modelId: string) {
        return Promise.resolve(mockModelSchema);
      },
      getCodelist(codelistUriOrId: string) {
        return Promise.resolve(mockCodelistDetail);
      }
};

const { mockModelSchema, mockCodelistDetail } = vi.hoisted(() => {
  return {
    mockModelSchema: {
      id: 'http://uri.suomi.fi/model/rytj-kaava-1.0.5',
      version: '1.0.5',
      metadata: {
        id: 'http://uri.suomi.fi/model/rytj-kaava-1.0.5',
        version: '1.0.5',
        name: { fi: 'Rakennetun ympäristön tietomalli', en: 'Built environment model' },
        description: { fi: 'Yleinen kaava kuvaus', en: 'Plan description' },
      },
      classes: [
        {
          id: 'http://uri.suomi.fi/model/rytj-kaava-1.0.5/Kaava',
          technicalName: 'Kaava',
          name: { fi: 'Kaava', en: 'Plan' },
          description: { fi: 'Yleinen kaava kuvaus', en: 'Plan description' },
          attributes: [
            {
              id: 'http://uri.suomi.fi/model/rytj-kaava-1.0.5/Kaava/kaavalaji',
              type: 'Literal',
              codelist: ['http://uri.suomi.fi/codelist/test/kaava_tyyppi'],
              cardinality: '1',
              name: { fi: 'Kaavalaji', en: 'Plan type' }
            }
          ],
          associations: []
        }
      ]
    },
    mockCodelistDetail: {
      id: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi',
      uri: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi',
      technicalName: 'kaava_tyyppi',
      name: { fi: 'Kaavalaji', en: 'Plan type' },
      status: 'VALID',
      originSyncTime: '',
      allVersions: [],
      vocabulary: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi',
      codes: [
        {
          uri: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi/1',
          codeValue: '1',
          name: { fi: 'Asemakaava' },
          status: 'VALID'
        }
      ]
    }
  };
});

const mockModelIndex = [
  {
    path: 'rytj-kaava-1.0.5.json',
    version: '1.0.5',
    latest: true
  }
];

const mockCodelistIndex = [
  {
    uri: 'http://uri.suomi.fi/codelist/test/kaava_tyyppi',
    path: 'test/kaava_tyyppi.json'
  }
];

vi.mock('../hooks/useOramaSearch', () => ({
  useOramaSearch: () => ({
    performSearch: vi.fn().mockResolvedValue([]),
    isInitializing: false,
  })
}));

// Mock motion/react to prevent requestAnimationFrame/animation-loop test hangs
vi.mock('motion/react', () => {
  return {
    motion: {
      div: ({ children, ...props }: any) => {
        const { transition, animate, initial, exit, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock Mermaid component to prevent loading heavy mermaid library or hitting document.fonts.ready which hangs in Happy DOM
vi.mock('./Mermaid', () => ({
  Mermaid: () => {
    return '<div data-testid="mock-mermaid">Mermaid Diagram</div>';
  }
}));


// Import DataModelView AFTER mocking Mermaid
import { DataModelView } from './DataModelView';

describe('DataModelView component', () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/tietomallit/index.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModelIndex)
        });
      }
      if (url.endsWith('/koodistot/index.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCodelistIndex)
        });
      }
      if (url.endsWith('/tietomallit/rytj-kaava-1.0.5.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModelSchema)
        });
      }
      if (url.endsWith('/koodistot/test/kaava_tyyppi.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCodelistDetail)
        });
      }
      return Promise.resolve({
        ok: false,
        statusText: 'Not Found'
      });
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads indices and rendering loading state initially', async () => {
    render(
      <DataModelView
        modelName="rytj-kaava"
        onBack={vi.fn()}
        navigate={vi.fn()}
        searchString=""
        dataModelAccess={mockDataModelAccess}
      />
    );

    // Spinner or skeleton exists
    expect(screen.getByText(t.common.loading || /Ladataan/i)).toBeDefined();

    const kaavaHeading = await screen.findByRole('heading', { name: 'Kaava' });
    expect(kaavaHeading).toBeDefined();
    expect(screen.getByText('Yleinen kaava kuvaus')).toBeDefined();
  });

  it('calls onBack handler when back button is clicked', async () => {
    const backSpy = vi.fn();
    render(
      <DataModelView
        modelName="rytj-kaava"
        onBack={backSpy}
        navigate={vi.fn()}
        searchString=""
        dataModelAccess={mockDataModelAccess}
      />
    );

    const backBtn = await screen.findByRole('button', { name: new RegExp(t.common.backToHome, 'i') });
    expect(backBtn).toBeDefined();

    fireEvent.click(backBtn);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

});
