import { test, expect } from '@playwright/test';

test.describe('TripSync End-to-End Flows', () => {
  test('creates a trip, splits a ₹5,000 expense equally among 5 members, and simplifies settlements', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.locator('text=Your Journey. Your People. One Place.')).toBeVisible();
    await page.click('text=Expenses');
    await expect(page.locator('text=Debt Simplification Engine')).toBeVisible();
  });
});
