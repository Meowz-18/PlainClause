/**
 * Accessibility E2E Tests — axe-core scan on all primary screens.
 *
 * Implements PRD §8 Success Metric:
 *   "Zero axe-core violations of `serious` or `critical` severity on all primary screens."
 *
 * Tests:
 * - Landing page (/)
 * - About page (/about)
 * - Workspace page (/analyze) — empty state
 * - Workspace page (/analyze) — after sample document load
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility — axe-core WCAG 2.2 AA', () => {
  test('Landing page (/) has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(serious).toEqual([]);
  });

  test('About page (/about) has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(serious).toEqual([]);
  });

  test('Workspace empty state (/analyze) has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/analyze');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(serious).toEqual([]);
  });

  test('Workspace with sample document has no serious or critical axe violations', async ({ page }) => {
    // Load a sample document first via the landing page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the first sample button to load a contract
    const sampleButton = page.locator('button:has-text("Rental Agreement")').first();
    if (await sampleButton.isVisible()) {
      await sampleButton.click();
      // Wait for navigation to /analyze
      await page.waitForURL('**/analyze', { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Wait for the workspace to render with findings
      await page.waitForTimeout(3000);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();

      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );

      expect(serious).toEqual([]);
    }
  });
});
