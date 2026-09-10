import { test, expect } from '@playwright/test';

/**
 * E2E Test: User Registration → Dashboard Browsing
 * 
 * Tests the complete flow:
 * 1. User lands on login page
 * 2. User clicks "Sign Up"
 * 3. User fills in registration form with invitation code
 * 4. User submits and gets redirected to dashboard
 * 5. User sees exercise list with Desperate Housewives
 */

test.describe('Registration → Browsing Flow', () => {
  test('should register new user with valid invitation code', async ({ page }) => {
    // Navigate to login page
    await page.goto('/');
    expect(page).toHaveURL('/');

    // Verify login page is displayed
    await expect(page.locator('h1')).toContainText('Login');

    // Click "Sign Up" link
    await page.click('button:has-text("Don\'t have an account? Sign up")');

    // Verify form changed to Sign Up
    await expect(page.locator('h1')).toContainText('Sign Up');

    // Fill in registration form
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[placeholder="Enter invitation code"]', 'TESTCODE');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 5000 });
    expect(page).toHaveURL('/dashboard');

    // Verify dashboard is displayed
    await expect(page.locator('h1')).toContainText('English Listening Dictation');
  });

  test('should show exercises on dashboard', async ({ page }) => {
    // First, register a user
    await page.goto('/');
    await page.click('button:has-text("Don\'t have an account? Sign up")');

    const email = `user-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[placeholder="Enter invitation code"]', 'TESTCODE');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard');

    // Verify exercise list is displayed
    await expect(page.locator('text=Available Exercises')).toBeVisible();

    // Look for Desperate Housewives
    const exerciseCard = page.locator('text=Desperate Housewives');
    await expect(exerciseCard).toBeVisible();
  });

  test('should allow user to login after registration', async ({ page }) => {
    const email = `login-test-${Date.now()}@example.com`;

    // Register first
    await page.goto('/');
    await page.click('button:has-text("Don\'t have an account? Sign up")');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[placeholder="Enter invitation code"]', 'TESTCODE');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/');

    // Login again with same credentials
    await expect(page.locator('h1')).toContainText('Login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Verify redirected to dashboard
    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText('English Listening Dictation');
  });
});
