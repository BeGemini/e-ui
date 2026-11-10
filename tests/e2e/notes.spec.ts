import { test, expect } from '@playwright/test';

/**
 * E2E Test: Note Maintenance Flow
 *
 * Tests the note user journeys:
 * 1. Dashboard shows note count and navigates to list page
 * 2. Note list page loads and displays categories
 */

test.describe('Notes Flow', () => {
  async function login(page: any) {
    await page.goto('/');
    await page.fill('input[type="email"]', 'student@example.com');
    await page.fill('input[type="password"]', 'Student123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  }

  test('should navigate to note list from dashboard', async ({ page }) => {
    await login(page);

    // Find an exercise card with a note button and click it
    const noteButton = page.locator('button[title="Notes"]').first();
    await expect(noteButton).toBeVisible();
    await noteButton.click();

    // Should navigate to the notes page
    await page.waitForURL(/\/dashboard\/.*\/notes/, { timeout: 5000 });

    // Page should show notes heading
    await expect(page.locator('h1')).toContainText('Notes');
  });

  test('should display note categories on list page', async ({ page }) => {
    await login(page);

    const noteButton = page.locator('button[title="Notes"]').first();
    await noteButton.click();
    await page.waitForURL(/\/dashboard\/.*\/notes/, { timeout: 5000 });

    // Empty state or category groups should be visible
    const emptyState = page.locator('text=No Notes Yet');
    const categoryBadge = page.locator('text=Word, Phrase, or Sentence').first();
    await expect(emptyState.or(categoryBadge)).toBeVisible();
  });
});
