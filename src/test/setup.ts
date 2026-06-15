/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, beforeAll, afterEach } from 'vitest';

// Stub global/window properties that are used by the components but not fully implemented in happy-dom
beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.scrollTo = vi.fn();
    
    // Mock IntersectionObserver if ever utilized
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    // Mock navigator.sendBeacon as a no-op spy in tests
    if (typeof navigator !== 'undefined') {
      (navigator as any).sendBeacon = vi.fn(() => true);
    }

    // Intercept fetch to block outbound analytics / tracker requests
    const originalFetch = globalThis.fetch;
    if (originalFetch) {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
        if (/(googletagmanager|google-analytics|analytics|telemetry|tracker|metrics)/i.test(urlStr)) {
          console.warn(`[Vitest Block] Blocked outbound fetch analytics request to: ${urlStr}`);
          return new Response(JSON.stringify({ blocked: true, status: 'Analytics request blocked in test environment' }), {
            status: 200,
            statusText: 'OK'
          });
        }
        return originalFetch(input, init);
      };
    }

    // Intercept XMLHttpRequest to block outbound analytics / tracker requests
    const OriginalXHR = globalThis.XMLHttpRequest;
    if (OriginalXHR) {
      const originalOpen = OriginalXHR.prototype.open;
      OriginalXHR.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (/(googletagmanager|google-analytics|analytics|telemetry|tracker|metrics)/i.test(urlStr)) {
          console.warn(`[Vitest Block] Blocked outbound XHR analytics request to: ${urlStr}`);
          return originalOpen.call(this, method, 'data:application/json,{"blocked":true}', ...args as any);
        }
        return originalOpen.call(this, method, url, ...args as any);
      };
    }
  }
});

afterEach(() => {
  if (typeof window !== 'undefined') {
    // Clear tracked events between tests
    const win = window as any;
    if (win._resetTrackedEvents) {
      win._resetTrackedEvents();
    } else {
      win._trackedEvents = [];
    }
  }
});
