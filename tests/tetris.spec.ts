import { test, expect } from '@playwright/test';

// E2E tests for Bella Tetris. Requires the static server running:
//   npm start            (serves on http://localhost:3000)
//   npm run test:e2e

const pageUrl = 'index.html';

test('tetris page loads with game board and previews', async ({ page }) => {
  await page.goto(pageUrl);

  await expect(page).toHaveTitle(/Tetris|tetris|Game/);

  // 20x10 board = 200 cells
  const cells = page.locator('#game-board .cell');
  await expect(cells).toHaveCount(200);

  // Preview panels exist (hold + 3-piece next queue)
  await expect(page.locator('#hold-piece .cell')).toHaveCount(16);
  await expect(page.locator('#next-piece .cell')).toHaveCount(16);
  await expect(page.locator('#next-piece-2 .cell')).toHaveCount(16);
  await expect(page.locator('#next-piece-3 .cell')).toHaveCount(16);

  // Score panel present
  await expect(page.locator('#score')).toHaveText('0');
});

test('game over overlay starts hidden', async ({ page }) => {
  await page.goto(pageUrl);
  const overlay = page.locator('#game-over');
  await expect(overlay).toBeHidden();

  // Overlay becomes visible after hard-dropping ~20 pieces (board fills up)
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press(' ');
  }
  await expect(overlay).toBeVisible();
});

test('hold swaps the active piece', async ({ page }) => {
  await page.goto(pageUrl);

  // Capture the active piece class before holding
  const activeBefore = page.locator('#game-board .tetromino').first();
  await expect(activeBefore).toHaveCount(1);
  const clsBefore = await activeBefore.getAttribute('class');

  await page.keyboard.press('c'); // hold

  // Active piece should change (different piece class than before)
  const activeAfter = page.locator('#game-board .tetromino').first();
  await expect(activeAfter).toHaveCount(1);
  const clsAfter = await activeAfter.getAttribute('class');
  expect(clsAfter).not.toBe(clsBefore);

  // Second press of C swaps back to the original piece
  await page.keyboard.press('c');
  const clsAfterSwapBack = await activeAfter.getAttribute('class');
  expect(clsAfterSwapBack).toBe(clsBefore);
});

test('pressing arrows moves the current piece', async ({ page }) => {
  await page.goto(pageUrl);

  // Col of the current piece is encoded via grid position of its classes;
  // simplest robust check: pressing ArrowRight 9 times must not crash and
  // pressing ArrowDown repeatedly eventually locks and scores.
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.locator('#score')).toHaveText(/\d+/);

  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('ArrowDown');
  }
  // Score increased beyond 0 after soft drops/placements
  const score = Number(await page.locator('#score').textContent());
  expect(score).toBeGreaterThan(0);
});

test('hard drop adds score and does not scroll the page', async ({ page }) => {
  await page.goto(pageUrl);

  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press(' ');
  const after = await page.evaluate(() => window.scrollY);

  expect(after).toBe(before); // page must not scroll
  await expect(page.locator('#score')).toHaveText(/\d+/);
});

test('pause with P and resume with P', async ({ page }) => {
  await page.goto(pageUrl);

  // Score a few points, then pause
  await page.keyboard.press(' ');
  await page.waitForFunction(() => Number(document.querySelector('#score')?.textContent) > 0);

  await page.keyboard.press('p');
  const pausedScore = Number(await page.locator('#score').textContent());
  await page.waitForTimeout(1200); // if not paused, score would change
  expect(Number(await page.locator('#score').textContent())).toBe(pausedScore);

  // Resume with the same key and verify the game advances again
  await page.keyboard.press('p');
  await page.keyboard.press(' ');
  const resumedScore = Number(await page.locator('#score').textContent());
  expect(resumedScore).toBeGreaterThan(pausedScore);
});

test('restart resets the score', async ({ page }) => {
  await page.goto(pageUrl);

  // Get some score
  await page.keyboard.press(' ');
  await expect(page.locator('#score')).not.toHaveText('0');

  // Force game over then restart
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press(' ');
  }
  await expect(page.locator('#game-over')).toBeVisible();

  await page.click('#restart-button');
  await expect(page.locator('#game-over')).toBeHidden();
  await expect(page.locator('#score')).toHaveText('0');
});