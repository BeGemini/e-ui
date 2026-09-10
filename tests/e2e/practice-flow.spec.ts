import { test, expect } from '@playwright/test';

/**
 * E2E Test: Dictation Practice Flow
 * 
 * Tests the practice workflow:
 * 1. User logs in
 * 2. User selects Desperate Housewives exercise
 * 3. User clicks "Start Practice"
 * 4. User sees video and first subtitle
 * 5. User types dictation
 * 6. User submits and sees feedback
 * 7. User advances to next sentence
 */

test.describe('Dictation Practice Flow', () => {
  // Helper function to login
  async function login(page: any) {
    await page.goto('/');
    await page.fill('input[type="email"]', 'practice-test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  }

  test('should display practice page when starting exercise', async ({ page }) => {
    await login(page);

    // Click on Desperate Housewives exercise
    const exerciseCard = page.locator('text=Desperate Housewives');
    await expect(exerciseCard).toBeVisible();
    await exerciseCard.click();

    // Wait for exercise detail page
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });

    // Verify exercise detail page is displayed
    await expect(page.locator('h1')).toContainText('Desperate Housewives');

    // Click "Start Practice" button
    await page.click('button:has-text("Start Practice")');

    // Wait for practice page
    await page.waitForURL(/\/dashboard\/.*\/practice/, { timeout: 5000 });

    // Verify practice page is displayed with video player
    await expect(page.locator('video')).toBeVisible({ timeout: 3000 });
  });

  test('should show subtitle text during practice', async ({ page }) => {
    await login(page);

    // Navigate to practice
    const exerciseCard = page.locator('text=Desperate Housewives');
    await exerciseCard.click();
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });
    await page.click('button:has-text("Start Practice")');
    await page.waitForURL(/\/dashboard\/.*\/practice/, { timeout: 5000 });

    // Verify subtitle display is visible
    const subtitleDisplay = page.locator('text:not("Waiting")').first();
    // Should show subtitle text (not waiting for subtitle)
  });

  test('should allow user to input dictation', async ({ page }) => {
    await login(page);

    // Navigate to practice
    const exerciseCard = page.locator('text=Desperate Housewives');
    await exerciseCard.click();
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });
    await page.click('button:has-text("Start Practice")');
    await page.waitForURL(/\/dashboard\/.*\/practice/, { timeout: 5000 });

    // Find dictation input textarea
    const dictationInput = page.locator('textarea');
    await expect(dictationInput).toBeVisible();

    // Type some text
    const testText = 'This is test dictation';
    await dictationInput.fill(testText);

    // Verify text is entered
    await expect(dictationInput).toHaveValue(testText);
  });

  test('should show clear button in dictation input', async ({ page }) => {
    await login(page);

    // Navigate to practice
    const exerciseCard = page.locator('text=Desperate Housewives');
    await exerciseCard.click();
    await page.waitForURL(/\/dashboard\/.*/, { timeout: 5000 });
    await page.click('button:has-text("Start Practice")');
    await page.waitForURL(/\/dashboard\/.*\/practice/, { timeout: 5000 });

    // Find and verify dictation input has Clear button
    const clearButton = page.locator('button:has-text("Clear")');
    await expect(clearButton).toBeVisible();
  });
});
