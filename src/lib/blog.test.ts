import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContentConfig } from './blog';

describe('getContentConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and return navigation and themes configuration', async () => {
    const mockConfig = {
      nav: [{ label: 'Blogi', type: 'blog' }],
      themes: [{ id: 'tietomallit', label: 'Tietomallit', tag: 'tietomallit' }]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConfig
    } as any);

    const config = await getContentConfig();
    expect(config.nav).toEqual(mockConfig.nav);
    expect(config.themes).toEqual(mockConfig.themes);
  });
});
