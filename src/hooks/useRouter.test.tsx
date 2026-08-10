/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouter, RouterProvider, useAppRouter } from './useRouter';
import React from 'react';

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

  it('determines the initial view as home when there are no path segments or query params', () => {
    const { result } = renderHook(() => useRouter());

    expect(result.current.activeView).toEqual({ type: 'home', slug: null });
  });

  it('determines activeView accurately based on URL pathname', () => {
    vi.stubGlobal('location', {
      search: '',
      pathname: '/blog/digital-twin-spec',
    });

    const { result } = renderHook(() => useRouter());
    expect(result.current.activeView).toEqual({ type: 'post', slug: 'digital-twin-spec' });
  });

  it('determines activeView based on URL search parameters fallback if pathname is root', () => {
    vi.stubGlobal('location', {
      search: '?post=digital-twin-spec',
      pathname: '/',
    });

    const { result } = renderHook(() => useRouter());
    expect(result.current.activeView).toEqual({ type: 'post', slug: 'digital-twin-spec' });
  });

  it('updates state via navigation and acts on location.pushState with path-based structure', () => {
    const { result } = renderHook(() => useRouter());

    act(() => {
      result.current.navigate({ type: 'page', slug: ' Tietomalli' });
    });

    // Verify it updates activeView accordingly and generates a correct pathname URL
    expect(result.current.activeView).toEqual({ type: 'page', slug: ' Tietomalli' });
    expect(window.history.pushState).toHaveBeenCalled();
  });

  it('handles popstate triggers dynamically with path-based structure', () => {
    const { result } = renderHook(() => useRouter());

    // Stub pathname to mock browser update prior to popstate dispatch
    (window.location as any).pathname = '/tag/data-exchange';

    act(() => {
      window.dispatchEvent(new Event('popstate'));
    });

    expect(result.current.activeView).toEqual({ type: 'tag', slug: 'data-exchange' });
  });

  it('sets pendingScroll to true and navigates to home when on non-home view', () => {
    vi.stubGlobal('location', {
      search: '',
      pathname: '/blog/digital-twin-spec',
    });
    const { result } = renderHook(() => useRouter());

    act(() => {
      result.current.scrollToBlog();
    });

    expect(result.current.pendingScroll).toBe(true);
    expect(window.history.pushState).toHaveBeenCalled();
  });

  it('scrolls smoothly to journal-section element after a timeout when already on home view', () => {
    vi.useFakeTimers();
    const scrollMock = vi.fn();
    const mockElement = { scrollIntoView: scrollMock };
    const getElementSpy = vi.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

    const { result } = renderHook(() => useRouter());

    act(() => {
      result.current.scrollToBlog();
    });

    // Before advancing timers, it shouldn't have queried/called scrollIntoView yet
    expect(getElementSpy).not.toHaveBeenCalled();

    // Fast-forward fake timers past 150ms delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(getElementSpy).toHaveBeenCalledWith('journal-section');
    expect(scrollMock).toHaveBeenCalledWith({ behavior: 'smooth' });

    getElementSpy.mockRestore();
    vi.useRealTimers();
  });

  it('correctly provides router via RouterProvider and useAppRouter', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RouterProvider>{children}</RouterProvider>
    );
    const { result } = renderHook(() => useAppRouter(), { wrapper });
    expect(result.current.activeView).toEqual({ type: 'home', slug: null });
  });
});

