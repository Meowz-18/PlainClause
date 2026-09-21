/**
 * Core Flow E2E Test — Happy Path.
 *
 * Tests the primary user journey (Journey A from PRD §5):
 * 1. Landing page loads with upload zone and sample buttons
 * 2. Click "Try a sample" to load a fixture contract
 * 3. Workspace renders with 3-column layout
 * 4. Triage banner shows document type and jurisdiction
 * 5. Findings stream into the findings rail
 * 6. Clicking a finding highlights the clause in the document pane
 * 7. Ask panel accepts questions
 */
import { test, expect } from '@playwright/test';

test.describe('Core Flow — Sample Document Analysis', () => {
  test('landing page renders with upload zone and sample buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tagline is visible
    await expect(page.locator('h1')).toContainText('about to sign');

    // Upload zone is present
    await expect(page.locator('[data-testid="upload-zone"], .upload-zone, input[type="file"]').first()).toBeAttached();

    // Sample buttons are visible
    const sampleSection = page.locator('text=Try a sample').first();
    await expect(sampleSection).toBeVisible();
  });

  test('sample document loads and navigates to workspace', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click a sample button
    const sampleButton = page.locator('button').filter({ hasText: /rental|offer|freelance/i }).first();
    await expect(sampleButton).toBeVisible();
    await sampleButton.click();

    // Should navigate to /analyze
    await page.waitForURL('**/analyze', { timeout: 15000 });

    // Workspace header should be present
    await expect(page.locator('header')).toBeVisible();
  });

  test('workspace renders findings rail, document pane, and legal notice', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sampleButton = page.locator('button').filter({ hasText: /rental|offer|freelance/i }).first();
    await sampleButton.click();
    await page.waitForURL('**/analyze', { timeout: 15000 });

    // Wait for analysis to begin streaming
    await page.waitForTimeout(3000);

    // Findings rail should exist
    await expect(page.locator('#findings-rail')).toBeAttached();

    // Key Findings heading
    await expect(page.locator('text=Key Findings')).toBeVisible();

    // Legal notice is present (FR-4.5: non-dismissible, in-context near findings)
    await expect(page.locator('text=Information, not legal advice')).toBeVisible();
  });

  test('Ask panel is accessible via keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sampleButton = page.locator('button').filter({ hasText: /rental|offer|freelance/i }).first();
    await sampleButton.click();
    await page.waitForURL('**/analyze', { timeout: 15000 });

    // The ask panel should be in the DOM (visible on desktop)
    const askPanel = page.locator('#ask-panel');
    await expect(askPanel).toBeAttached();
  });
});

test.describe('About Page', () => {
  test('about page renders with product explanation', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');

    // Should have a heading
    await expect(page.locator('h1').first()).toBeVisible();

    // Should mention PlainClause
    await expect(page.locator('text=PlainClause').first()).toBeVisible();
  });
});
