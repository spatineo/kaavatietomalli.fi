/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouter } from './useRouter';

describe('useRouter hook', () => {
  beforeEach(() => {
    // Reset location and history globals
    vi.stubGlobal('location', {
      search: '',
      pathname: '/',
    });
    vi.stubGlobal('history', {
      pushState: vi.fn(),
    });
  });

  it('determines the initial view as home when there are no query params', () => {
    const { result } = renderHook(() => useRouter());

    expect(result.current.activeView).toEqual({ type: 'home', slug: null });
  });

  it('determines activeView accurately based on URL search parameters', () => {
    vi.stubGlobal('location', {
      search: '?post=digital-twin-spec',
      pathname: '/',
    });

    const { result } = renderHook(() => useRouter());
    expect(result.current.activeView).toEqual({ type: 'post', slug: 'digital-twin-spec' });
  });

  it('updates state via navigation and acts on location.pushState', () => {
    const { result } = renderHook(() => useRouter());

    act(() => {
      result.current.navigate({ type: 'page', slug: ' Tietomalli' });
    });

    // Verify it updates activeView accordingly
    expect(result.current.activeView).toEqual({ type: 'page', slug: ' Tietomalli' });
    expect(window.history.pushState).toHaveBeenCalled();
  });

  it('handles popstate triggers dynamically', () => {
    const { result } = renderHook(() => useRouter());

    // Stub search string to mock browser update prior to popstate dispatch
    (window.location as any).search = '?tag=data-exchange';

    act(() => {
      window.dispatchEvent(new Event('popstate'));
    });

    expect(result.current.activeView).toEqual({ type: 'tag', slug: 'data-exchange' });
  });
});
