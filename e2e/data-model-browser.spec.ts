import { test, expect } from '@playwright/test';
import { fi } from '../src/i18n/fi';

const t = fi;

test.describe('Kaavatietomalli E2E Data Model Browser', () => {
  test.beforeEach(async ({ page, context }) => {
    // 1. Prevent analytics/metrics scripts from clogging e2e logs
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

    // 2. Bypass password gate
    await context.addInitScript(() => {
      window.sessionStorage.setItem('prelaunch_authenticated', 'true');
      (window as any).__E2E_TEST__ = true;
    });
  });

  test('1. Navigation & Header: Can load a data model browser view directly', async ({ page }) => {
    // Navigate straight to rytj-kaava model view
    await page.goto('/?model=rytj-kaava');

    // Confirm model-view layout is active
    const layout = page.locator('[data-testid="app-layout"]');
    await expect(layout).toBeVisible();
    await expect(layout).toHaveAttribute('data-view-type', 'model');
    await expect(layout).toHaveAttribute('data-view-slug', 'rytj-kaava');

    // Check title presence
    const browserTitle = page.locator(`text=${t.dataModel.dataModelBrowser}`).first();
    await expect(browserTitle).toBeVisible();

    // Confirm model name (Finnish fallback / default language) is rendered
    const modelHeader = page.locator('h1').first();
    await expect(modelHeader).toBeVisible();
    await expect(modelHeader).toContainText('Kaavatietomalli');
  });

  test('2. Accordion Interaction: Can toggle documentation pane', async ({ page }) => {
    await page.goto('/?model=rytj-kaava');

    // Details accordion trigger
    const accordionBtn = page.locator(`button:has-text("${t.dataModel.modelDetails}")`);
    await expect(accordionBtn).toBeVisible();

    // Documentation details should not be visible before clicking accordion (as it is closed by default now)
    // We target the specific h3 inside the collapsible pane so we do not match the "Näytä dokumentaatio" button text
    const docHeader = page.locator('h3').locator(`text=${t.dataModel.documentationAndHistory}`);
    await expect(docHeader).not.toBeVisible();

    // Toggle open
    await accordionBtn.click();

    // Check description/documentation container is visible now
    await expect(docHeader).toBeVisible();
  });

  test('3. Selector Dropdown: Search and select a class elements, rendering panel details', async ({ page }) => {
    await page.goto('/?model=rytj-kaava');

    // Find search combo input using its robust data-testid attribute
    const inputField = page.locator('[data-testid="class-codelist-input"]');
    await expect(inputField).toBeVisible();

    // Click/focus combo input to expand class list options
    await inputField.click();

    // Verify list headings are listed
    const classesGroup = page.locator(`text=${t.dataModel.classesOptGroup}`);
    await expect(classesGroup).toBeVisible();

    // Click class list item "Kaavakohde"
    const classBtn = page.locator('button:has-text("Kaavakohde")').first();
    await expect(classBtn).toBeVisible();
    await classBtn.click();

    // Dropdown list should close, select input reflects selected state label
    await expect(classesGroup).not.toBeVisible();

    // Confirm Class Info panel renders details and attributes table
    const attributesHeader = page.locator(`text=${t.dataModel.attributes}`);
    await expect(attributesHeader).toBeVisible();

    const technicalNameLabel = page.locator(`text=${t.dataModel.technicalNameOrId}`);
    await expect(technicalNameLabel).toBeVisible();

    // Confirm URL updated query state
    const currentUrl = page.url();
    expect(currentUrl).toContain('class=Kaavakohde');
  });

  test('4. Language & Version Toggling: Update parameters and adjust state correctly', async ({ page }) => {
    // We use "Asiakirja" class because it exists reliably across all rytj-kaava versions (1.0.4, 1.0.5, etc.)
    await page.goto('/?model=rytj-kaava&class=Asiakirja');

    // Initial state check
    const modelHeader = page.locator('h1').first();
    await expect(modelHeader).toContainText('Kaavatietomalli');

    // Switch data language to English
    const enButton = page.locator('button:has-text("English")');
    await expect(enButton).toBeVisible();
    await enButton.click();

    // Title should update in English
    await expect(modelHeader).toContainText('Data model for land use plans');

    // Switch version using select drop down
    const versionSelect = page.locator('select').first();
    await expect(versionSelect).toBeVisible();

    // Select alternative version (e.g. 1.0.4)
    await versionSelect.selectOption('1.0.4');

    // Confirm url queries are properly synced
    const currentUrl = page.url();
    expect(currentUrl).toContain('version=1.0.4');
    expect(currentUrl).toContain('lang=en');
    expect(currentUrl).toContain('class=Asiakirja');
  });
});
