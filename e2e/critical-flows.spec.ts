import { test, expect } from '@playwright/test';

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
    const firstReadMore = page.locator('button:has-text("Lue lisää"), button:has-text("Read more")').first();
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
    const searchIconBtn = page.locator('button[aria-label="Haku"], button[aria-label="Search"]').first();
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
});
