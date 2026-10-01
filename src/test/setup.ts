/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, beforeAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Stub global/window properties that are used by the components but not fully implemented in happy-dom
beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.scrollTo = vi.fn();
    
    // Intercept click events to prevent external navigations in tests (which triggers happy-dom page fetching)
    window.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.href) {
        const urlStr = target.href;
        if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
          if (!urlStr.includes('localhost') && !urlStr.includes('127.0.0.1')) {
            e.preventDefault();
          }
        }
      }
    }, true);
    
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

    // Intercept fetch to block outbound analytics, serve local files from test-public/public, and mock external JS/CDNs
    const originalFetch = globalThis.fetch;
    if (originalFetch) {
      const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
        
        // 1. Block analytics & metrics
        if (/(googletagmanager|google-analytics|analytics|telemetry|tracker|metrics)/i.test(urlStr)) {
          return new Response(JSON.stringify({ blocked: true, status: 'Analytics request blocked in test environment' }), {
            status: 200,
            statusText: 'OK'
          });
        }

        // 2. Mock external JS / CDN scripts to avoid network fetch errors in happy-dom
        if (
          urlStr.includes('unpkg.com') ||
          urlStr.includes('cdnjs.cloudflare.com') ||
          urlStr.includes('cdn.jsdelivr.net') ||
          urlStr.includes('kaavatietomalli.fi/js') ||
          urlStr.endsWith('.js')
        ) {
          return new Response('// Mocked CDN / Javascript resource', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
          });
        }

        // 3. Serve local documents / assets from the filesystem
        let pathname = '';
        if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
          try {
            const parsedUrl = new URL(urlStr);
            if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname.includes('kaavatietomalli.fi')) {
              pathname = parsedUrl.pathname;
            }
          } catch {}
        } else if (urlStr.startsWith('/')) {
          pathname = urlStr.split('?')[0];
        } else if (!urlStr.includes('://')) {
          pathname = '/' + urlStr.split('?')[0];
        }

        if (pathname) {
          const cleanPath = pathname.replace(/^\/+/, '');
          const possiblePaths = [
            path.join(process.cwd(), 'test-public', cleanPath),
            path.join(process.cwd(), 'public', cleanPath),
            path.resolve('/app/applet/test-public', cleanPath),
            path.resolve('/app/applet/public', cleanPath),
          ];

          for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              try {
                const fileContent = fs.readFileSync(filePath);
                return new Response(fileContent, {
                  status: 200,
                  headers: {
                    'Content-Type': filePath.endsWith('.json') ? 'application/json' : 'text/plain'
                  }
                });
              } catch (err) {
                console.error(`[Vitest Local Fetch] Error reading local file ${filePath}:`, err);
              }
            }
          }
        }

        return originalFetch(input, init);
      };

      globalThis.fetch = interceptedFetch;
      if (typeof window !== 'undefined') {
        window.fetch = interceptedFetch;
      }
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
