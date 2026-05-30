import { test, expect } from '@playwright/test';
import { fi } from '../src/i18n/fi';

const t = fi;

test.describe('Kaavatietomalli E2E Critical User Flows', () => {
  test.beforeEach(async ({ page, context }) => {
    // 1. Bypass the PasswordGate if active by setting sessionStorage
    await context.addInitScript(() => {
      window.sessionStorage.setItem('prelaunch_authenticated', 'true');
    });

    // 2. Navigate to root
    await page.goto('/');
  });

  test('1. The Navigation Flow: User can navigate to a blog post, inspect content, and return home', async ({ page }) => {
    // Check we loaded the homepage successfully
    const layout = page.locator('[data-testid="app-layout"]');
    await expect(layout).toBeVisible();
    await expect(layout).toHaveAttribute('data-view-type', 'home');

    // Confirm home-view wrapper is present
    const homeView = page.locator('[data-testid="home-view"]');
    await expect(homeView).toBeVisible();

    // Find the first "Lue lisää" button inside the Timeline and click it
    const firstReadMore = page.locator(`button:has-text("${t.post.readMore}")`).first();
    await expect(firstReadMore).toBeVisible();
    await firstReadMore.click();

    // Verify view has updated to "post" layout state
    await expect(layout).toHaveAttribute('data-view-type', 'post');
    const postView = page.locator('[data-testid="post-view"]');
    await expect(postView).toBeVisible();

    // Locate the return link/button using the exact data-testid
    const backBtn = page.locator('[data-testid="back-to-home-btn"]');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // Verify we are back on the homepage layout
    await expect(layout).toHaveAttribute('data-view-type', 'home');
    await expect(homeView).toBeVisible();
  });

  test('2. Search Verification & Highlighting: User can open search widget, enter query, and inspect hover highlight effects', async ({ page }) => {
    // Verify search container can expand
    const searchIconBtn = page.locator(`button[aria-label="${t.search.title}"]`).first();
    await expect(searchIconBtn).toBeVisible();
    await searchIconBtn.click();

    // Verify search input is focused and visible
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();

    // Enter query "Tieto" to trigger searches
    await searchInput.fill('Tieto');

    // Confirm that the search results container mounts choices
    const resultsContainer = page.locator('[data-testid="search-results-container"]');
    await expect(resultsContainer).toBeVisible();

    // Select first result block
    const firstResult = resultsContainer.locator('button').first();
    await expect(firstResult).toBeVisible();

    // Hover over search item to assert highlight changes/hover classes
    await firstResult.hover();
    await expect(firstResult).toHaveClass(/hover:bg-white\/5/);
  });

  test('3. Cookie Consent Banner: User can accept, reject, and adjust custom settings, persisting state properly', async ({ page }) => {
    // Clear localStorage to simulate fresh visitor
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Force prelaunch authentication gate bypass if present
    await page.evaluate(() => {
      window.sessionStorage.setItem('prelaunch_authenticated', 'true');
    });

    // Wait for the cookie consent banner to appear (inner delay is 1.5s, wait max 5s)
    const banner = page.locator(`text=${t.consent.title}`);
    await expect(banner).toBeVisible({ timeout: 5000 });

    // The description should be present and match user expectations
    const descExcerpt = t.consent.description.substring(0, 30);
    await expect(page.locator(`text=${descExcerpt}`)).toBeVisible();

    // Click customize button
    const customizeBtn = page.locator('[data-testid="cookie-consent-banner"]').locator(`button:has-text("${t.consent.customize}")`);
    await expect(customizeBtn).toBeVisible();
    await customizeBtn.click();

    // Verify options expand and display titles
    await expect(page.locator(`text=${t.consent.essentials.title}`)).toBeVisible();
    const analyticsLabel = page.locator(`text=${t.consent.analytics.title}`);
    await expect(analyticsLabel).toBeVisible();

    // Toggle analytics off (by default it starts as true, toggle click turns it false)
    const toggleButton = page.locator('[data-testid="analytics-consent-toggle"]').first();
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // Wait for the toggle to visually update (representing state update)
    await expect(toggleButton).toHaveClass(/bg-slate-700/);

    // Save customized preferences
    const saveBtn = page.locator('[data-testid="cookie-consent-banner"]').locator(`button:has-text("${t.consent.save}")`);
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Banner should hide immediately
    await expect(banner).not.toBeVisible();

    // Check localStorage state is correct (analytics off)
    let consent = await page.evaluate(() => localStorage.getItem('cookie_consent_settings'));
    expect(consent).not.toBeNull();
    expect(JSON.parse(consent!).analytics).toBe(false);

    // Verify clicking manual settings icon floating at bottom triggers banner opening
    const consentIconBtn = page.locator('button:has(svg.lucide-cookie)').first();
    await expect(consentIconBtn).toBeVisible();
    await consentIconBtn.click();

    // Banner should open immediately (no 1.5s delay on manual trigger)
    await expect(banner).toBeVisible();

    // Click Accept All
    const acceptAllBtn = page.locator('[data-testid="cookie-consent-banner"]').locator(`button:has-text("${t.consent.acceptAll}")`);
    await expect(acceptAllBtn).toBeVisible();
    await acceptAllBtn.click();

    // Banner should close
    await expect(banner).not.toBeVisible();

    // Verify localStorage updated to true
    consent = await page.evaluate(() => localStorage.getItem('cookie_consent_settings'));
    expect(JSON.parse(consent!).analytics).toBe(true);
  });

  test('4. Mobile Navigation Drawer: Small viewport toggles navigation anchors and maintains scroll position', async ({ page }) => {
    // Set viewport to mobile standard
    await page.setViewportSize({ width: 375, height: 667 });

    // Pre-seed consent to true to avoid banner occlusion during mobile gestures
    await page.evaluate(() => {
      localStorage.setItem('cookie_consent_settings', JSON.stringify({ analytics: true, timestamp: Date.now() }));
    });
    await page.reload();

    const menuButton = page.locator(`button[aria-label="${t.navigation.openMenu}"]`).first();
    await expect(menuButton).toBeVisible();

    // Scroll down on homepage to verify sticky header/relative container scroll sanity
    await page.evaluate(() => window.scrollTo(0, 300));
    const scrollTopBefore = await page.evaluate(() => window.scrollY);
    expect(scrollTopBefore).toBeGreaterThanOrEqual(200);

    // Open mobile menu drawer overlay
    await menuButton.dispatchEvent('click');

    // Confirm Close Menu state updates label correctly
    const closeButton = page.locator(`button[aria-label="${t.navigation.closeMenu}"]`).first();
    await expect(closeButton).toBeVisible();

    // In mobile dropdown, the search input is hidden inside the widget button initially. Click it to expand.
    const mobileSearchBtn = page.locator('nav').locator(`button[aria-label="${t.search.title}"]`).first();
    await expect(mobileSearchBtn).toBeVisible();
    await mobileSearchBtn.dispatchEvent('click');

    // Verify search input is displayed in mobile dropdown view
    const mobileSearchInput = page.locator('nav').locator('[data-testid="search-input"]').first();
    await expect(mobileSearchInput).toBeVisible();

    // Close Menu drawer
    await closeButton.dispatchEvent('click');

    // Verify menu elements return to default
    await expect(menuButton).toBeVisible();
    await expect(closeButton).not.toBeVisible();

    // Assert that scroll state was not disrupted or forced back to 0
    const scrollTopAfter = await page.evaluate(() => window.scrollY);
    expect(scrollTopAfter).toBeCloseTo(scrollTopBefore, 0);
  });
});
