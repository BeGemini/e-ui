import { test, expect } from '@playwright/test';

/**
 * E2E Test: Subtitle Customization
 * 
 * Tests the subtitle configuration workflow:
 * 1. User logs in and selects exercise
 * 2. User clicks "Customize Subtitles"
 * 3. User sees subtitle list with locked/editable sections
 * 4. User can merge sentences
 * 5. User can mark sentences as skip
 * 6. User saves configuration
 * 7. Changes apply to next practice session
 */

test.describe('Subtitle Customization Flow', () => {
  // Helper function to login
  async function login(page: any) {
    await page.goto('/');
    await page.fill('input[type="email"]', 'subtitle-test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  }

  test('should navigate to subtitle editor', async ({ page }) => {
    await login(page);

    // Click on Desperate Housewives exercise
    const exerciseCard = page.locator('text=Desperate Housewives');
    await exerciseCard.click();
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });

    // Verify exercise detail page
    await expect(page.locator('h1')).toContainText('Desperate Housewives');

    // Click "Customize Subtitles" button
    const customizeBtn = page.locator('button:has-text("Customize Subtitles")');
    await expect(customizeBtn).toBeVisible();
    await customizeBtn.click();

    // Wait for subtitle editor page
    await page.waitForURL(/\/dashboard\/.*\/subtitles/, { timeout: 5000 });

    // Verify subtitle editor is displayed
    await expect(page.locator('text=Customize Subtitles').or(page.locator('h1'))).toBeVisible();
  });

  test('should display subtitle list', async ({ page }) => {
    await login(page);

    // Navigate to subtitle editor
    const exerciseCard = page.locator('text=Desperate Housewives');
    await exerciseCard.click();
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });
    await page.click('button:has-text("Customize Subtitles")');
    await page.waitForURL(/\/dashboard\/.*\/subtitles/, { timeout: 5000 });

    // Verify subtitle list is displayed
    const subtitleListItems = page.locator('[role="checkbox"]');
    // Should have subtitle checkboxes for editing
    await expect(subtitleListItems.first()).toBeVisible();
  });

  test('should have save and reset buttons', async ({ page }) => {
    await login(page);

    // Navigate to subtitle editor
    const exerciseCard = page.locator('text=Desperate Housewives');
    await exerciseCard.click();
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });
    await page.click('button:has-text("Customize Subtitles")');
    await page.waitForURL(/\/dashboard\/.*\/subtitles/, { timeout: 5000 });

    // Verify Save button
    const saveBtn = page.locator('button:has-text("Save")');
    await expect(saveBtn).toBeVisible();

    // Verify Reset button
    const resetBtn = page.locator('button:has-text("Reset")');
    await expect(resetBtn).toBeVisible();

    // Verify Cancel button
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await expect(cancelBtn).toBeVisible();
  });

  test('should allow user to go back from subtitle editor', async ({ page }) => {
    await login(page);

    // Navigate to subtitle editor
    const exerciseCard = page.locator('text=Desperate Housewives');
    await exerciseCard.click();
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });
    await page.click('button:has-text("Customize Subtitles")');
    await page.waitForURL(/\/dashboard\/.*\/subtitles/, { timeout: 5000 });

    // Click Cancel button
    await page.click('button:has-text("Cancel")');

    // Should go back to exercise detail
    await page.waitForURL(/\/dashboard\/[^/]+\/?$/, { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Desperate Housewives');
  });
});
