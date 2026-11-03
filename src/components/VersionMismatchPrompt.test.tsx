/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VersionMismatchPrompt } from './VersionMismatchPrompt';
import { getTranslations } from '../i18n';

const t = getTranslations();

const mockFetchServerVersion = vi.fn();
const mockGetBuildVersion = vi.fn();

vi.mock('../lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/utils')>();
  return {
    ...actual,
    fetchServerVersion: () => mockFetchServerVersion(),
  };
});

vi.mock('../lib/blog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/blog')>();
  return {
    ...actual,
    getBuildVersion: () => mockGetBuildVersion(),
  };
});

describe('VersionMismatchPrompt component', () => {
  let originalLocation: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('1000');

    originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: 'http://localhost:3000/',
      search: '',
      replace: vi.fn(),
    };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('renders nothing when client and server versions match', async () => {
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('1000');

    render(<VersionMismatchPrompt />);

    await waitFor(() => {
      expect(screen.queryByText(t.versionMismatch.title)).toBeNull();
    });
  });

  it('shows prompt when server version differs from build version', async () => {
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('2000');

    render(<VersionMismatchPrompt />);

    await waitFor(() => {
      expect(screen.getByText(t.versionMismatch.title)).toBeDefined();
      expect(screen.getByText(t.versionMismatch.description)).toBeDefined();
    });

    const reloadBtn = screen.getByText(t.versionMismatch.button);
    expect(reloadBtn).toBeDefined();

    fireEvent.click(reloadBtn);
    expect(window.location.replace).toHaveBeenCalledWith(
      expect.stringContaining('version=2000')
    );
  });

  it('triggers prompt immediately on vite:preloadError event', async () => {
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('1000'); // Even if server version is currently same or not fetched yet

    render(<VersionMismatchPrompt />);

    expect(screen.queryByText(t.versionMismatch.title)).toBeNull();

    window.dispatchEvent(new Event('vite:preloadError'));

    await waitFor(() => {
      expect(screen.getByText(t.versionMismatch.title)).toBeDefined();
    });
  });

  it('triggers prompt immediately on app:chunkLoadError custom event', async () => {
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('1000');

    render(<VersionMismatchPrompt />);

    expect(screen.queryByText(t.versionMismatch.title)).toBeNull();

    window.dispatchEvent(new CustomEvent('app:chunkLoadError', {
      detail: { error: new Error('Failed to fetch dynamically imported module: /assets/Mermaid.js') }
    }));

    await waitFor(() => {
      expect(screen.getByText(t.versionMismatch.title)).toBeDefined();
    });
  });

  it('triggers prompt immediately on Safari dynamic module script error', async () => {
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('1000');

    render(<VersionMismatchPrompt />);

    expect(screen.queryByText(t.versionMismatch.title)).toBeNull();

    const safariErrorEvent = new ErrorEvent('error', {
      message: 'Importing a module script failed.',
      error: new TypeError('Importing a module script failed.')
    });
    window.dispatchEvent(safariErrorEvent);

    await waitFor(() => {
      expect(screen.getByText(t.versionMismatch.title)).toBeDefined();
    });
  });

  it('triggers prompt immediately on unhandled promise rejection with chunk error', async () => {
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('1000');

    render(<VersionMismatchPrompt />);

    expect(screen.queryByText(t.versionMismatch.title)).toBeNull();

    const rejectionEvent = new CustomEvent('unhandledrejection') as any;
    rejectionEvent.reason = new Error('error loading dynamically imported module: /assets/index.js');
    window.dispatchEvent(rejectionEvent);

    await waitFor(() => {
      expect(screen.getByText(t.versionMismatch.title)).toBeDefined();
    });
  });

  it('allows user to postpone the prompt', async () => {
    mockGetBuildVersion.mockResolvedValue('1000');
    mockFetchServerVersion.mockResolvedValue('2000');

    render(<VersionMismatchPrompt />);

    await waitFor(() => {
      expect(screen.getByText(t.versionMismatch.title)).toBeDefined();
    });

    const laterBtn = screen.getByText(t.versionMismatch.buttonLater);
    fireEvent.click(laterBtn);

    await waitFor(() => {
      expect(screen.queryByText(t.versionMismatch.title)).toBeNull();
    });
  });
});

