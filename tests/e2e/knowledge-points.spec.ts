import { test, expect } from '@playwright/test';

/**
 * E2E Test: Knowledge Point Maintenance Flow
 *
 * Tests the knowledge point user journeys:
 * 1. Dashboard shows knowledge point count and navigates to list page
 * 2. Knowledge point list page loads and displays categories
 */

test.describe('Knowledge Points Flow', () => {
  async function login(page: any) {
    await page.goto('/');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'Student123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  }

  test('should navigate to knowledge point list from dashboard', async ({ page }) => {
    await login(page);

    // Find an exercise card with a knowledge point button and click it
    const knowledgePointButton = page.locator('button[title="Knowledge points"]').first();
    await expect(knowledgePointButton).toBeVisible();
    await knowledgePointButton.click();

    // Should navigate to the knowledge points page
    await page.waitForURL(/\/dashboard\/.*\/knowledge-points/, { timeout: 5000 });

    // Page should show knowledge points heading
    await expect(page.locator('h1')).toContainText('Knowledge Points');
  });

  test('should display knowledge point categories on list page', async ({ page }) => {
    await login(page);

    const knowledgePointButton = page.locator('button[title="Knowledge points"]').first();
    await knowledgePointButton.click();
    await page.waitForURL(/\/dashboard\/.*\/knowledge-points/, { timeout: 5000 });

    // Empty state or category groups should be visible
    const emptyState = page.locator('text=No Knowledge Points Yet');
    const categoryBadge = page.locator('text=Word, Phrase, or Sentence').first();
    await expect(emptyState.or(categoryBadge)).toBeVisible();
  });
});
