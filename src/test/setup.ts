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
