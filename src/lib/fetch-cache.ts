/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const promiseCache = new Map<string, Promise<any>>();

/**
 * Fetches JSON from a URL and caches the resulting Promise.
 * Subsequent or concurrent requests for the exact same URL will return
 * the same Promise instance, ensuring only a single network request is made.
 */
export function fetchJsonCached<T = any>(url: string): Promise<T> {
  let promise = promiseCache.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((res) => {
        if (!res.ok) {
          promiseCache.delete(url); // Remove failed request from cache
          throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
        }
        return res.json();
      })
      .catch((err) => {
        promiseCache.delete(url); // Remove failed request from cache
        throw err;
      });
    promiseCache.set(url, promise);
  }
  return promise;
}

/**
 * Clears the fetch cache. Useful for tests or cache busting.
 */
export function clearFetchCache(): void {
  promiseCache.clear();
}
