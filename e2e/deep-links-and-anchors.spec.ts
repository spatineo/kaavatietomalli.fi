import { test, expect } from '@playwright/test';
import { fi } from '../src/i18n/fi';

const t = fi;

test.describe('Kaavatietomalli E2E Deep Links and Anchor Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    // 1. Prevent analytics from cluttering tests
    await page.route(
      (url) => {
        const urlStr = url.href;
        if (urlStr.includes('/src/') || urlStr.includes('/assets/') || urlStr.includes('kaavatietomalli-logo')) {
          return false;
        }
        return /(googletagmanager|google-analytics|analytics|telemetry|tracker|metrics|giscus)/i.test(urlStr);
      },
      route => route.abort()
    );

    // 2. Bypass prelaunch password gate by writing token to sessionStorage
    await context.addInitScript(() => {
      window.sessionStorage.setItem('prelaunch_authenticated', 'true');
      (window as any).__E2E_TEST__ = true;
    });
  });

  test('1. Heading Anchors and Link Icons are rendered correctly', async ({ page }) => {
    // Navigate to a page with content (lainsaadanto)
    await page.goto('/?page=lainsaadanto');

    // Confirm PageView is loaded
    const pageView = page.locator('[data-testid="page-view"]');
    await expect(pageView).toBeVisible();

    // Find the first heading of the content (for example, h2)
    const h2Element = page.locator('.markdown-body h2').first();
    await expect(h2Element).toBeVisible();

    // Check that it has an 'id' attribute that matches kebab-case
    const id = await h2Element.getAttribute('id');
    expect(id).not.toBeNull();
    expect(id).toMatch(/^[a-z0-9-]+$/);

    // Verify hover link icon exists
    const linkIcon = h2Element.locator('a[href^="#"]');
    await expect(linkIcon).toBeAttached();
  });

  test('2. Foldable Table of Contents renders for pages with >2 headings', async ({ page }) => {
    // Navigate to a page with many headings
    await page.goto('/?page=lainsaadanto');

    // Verify TOC trigger exists and has hamburger icon
    const tocTrigger = page.locator('[data-testid="toc-trigger"]');
    await expect(tocTrigger).toBeVisible();

    // Initially, popup should NOT be visible
    const tocPopupBefore = page.locator('[data-testid="toc-popup"]');
    await expect(tocPopupBefore).not.toBeVisible();

    // Click trigger to open popup
    await tocTrigger.click();

    // Verify popup is now visible
    const tocPopupAfter = page.locator('[data-testid="toc-popup"]');
    await expect(tocPopupAfter).toBeVisible();

    // Verify headings are listed inside the TOC
    const items = tocPopupAfter.locator('button');
    const count = await items.count();
    expect(count).toBeGreaterThan(2);

    // Click on a heading in the TOC to trigger anchor navigation
    const targetHeading = items.nth(1);
    const headingText = await targetHeading.textContent();
    expect(headingText).not.toBeNull();

    await targetHeading.click();

    // Popup should close
    await expect(tocPopupAfter).not.toBeVisible();
  });

  test('3. Deep Links with hash part load correctly and scroll to anchor', async ({ page }) => {
    // We deep link directly to lainsaadanto page with an anchor hash
    const targetHash = 'kansallisesti-yhteentoimivan-kaavatiedon-sisalto-ja-rakenne';
    await page.goto(`/?page=lainsaadanto#${targetHash}`);

    // Wait for the page to be visible and fully loaded
    const pageView = page.locator('[data-testid="page-view"]');
    await expect(pageView).toBeVisible();

    // Verify that the element with that ID exists in the DOM
    const anchoredHeading = page.locator(`#${targetHash}`);
    await expect(anchoredHeading).toBeVisible();

    // Wait for scroll to complete
    await page.waitForTimeout(1000);

    // Assert that the page has scrolled from the top (scrollY > 0)
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });
});
