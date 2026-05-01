import { test, expect } from '@playwright/test';

test('tetris page loads', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  await page.goto(base + '/index.html');
  await expect(page).toHaveTitle(/Tetris|tetris|Game/);
});
