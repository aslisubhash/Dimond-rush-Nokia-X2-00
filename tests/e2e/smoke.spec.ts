import { expect, test, type Page } from '@playwright/test';

const activeScenes = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const g = (window as unknown as { __phaser?: { scene: { getScenes: (a: boolean) => { scene: { key: string } }[] } } }).__phaser;
    return g ? g.scene.getScenes(true).map((s) => s.scene.key) : [];
  });

async function waitForScene(page: Page, key: string, timeout = 30_000): Promise<void> {
  await expect.poll(() => activeScenes(page), { timeout }).toContain(key);
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

test('new game → story → world map → clear 1-1 → results → progress saved', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await waitForScene(page, 'Title');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'Story');
  for (let i = 0; i < 20 && !(await activeScenes(page)).includes('WorldMap'); i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
  }
  await waitForScene(page, 'WorldMap');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'Game');
  const levelId = await page.evaluate(() => (window as unknown as { __game: { world: { level: { spec: { id: string } } } } }).__game.world.level.spec.id);
  expect(levelId).toBe('1-1');
  // Walk a little with the real keyboard, then skip ahead to the exit.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  const moved = await page.evaluate(() => (window as unknown as { __game: { world: { player: { x: number } } } }).__game.world.player.x);
  expect(moved).toBeGreaterThan(3 * 32);
  await page.evaluate(() => {
    const w = (window as unknown as { __game: { world: { entities: { type: string; x: number; y: number; h: number }[]; player: { x: number; y: number; h: number } } } }).__game.world;
    const exit = w.entities.find((e) => e.type === 'exit_gate')!;
    w.player.x = exit.x + 8;
    w.player.y = exit.y + exit.h - w.player.h;
  });
  await waitForScene(page, 'Results', 20_000);
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'WorldMap');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('relics-six-temples.save') ?? '{}'));
  expect(save.levels['1-1'].completed).toBe(true);
  // Reload: the save persists and "Continue" leads straight to the map.
  await page.reload();
  await waitForScene(page, 'Title');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await waitForScene(page, 'WorldMap');
  expect(errors).toEqual([]);
});

test('every one of the 48 levels boots and runs without errors', async ({ page }) => {
  const errors = trackErrors(page);
  const ids: string[] = [];
  for (let w = 1; w <= 6; w++) for (let l = 1; l <= 8; l++) ids.push(`${w}-${l}`);
  // Unlock everything so the debug ?level= hook is allowed.
  await page.goto('/');
  await page.evaluate((all) => {
    const levels: Record<string, { completed: boolean }> = {};
    for (const id of all) levels[id] = { completed: true };
    localStorage.setItem('relics-six-temples.save', JSON.stringify({ version: 2, levels, seenIntro: true }));
  }, ids);
  for (const id of ids) {
    await page.goto(`/?level=${id}`);
    await waitForScene(page, 'Game');
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __game?: { world: { level: { spec: { id: string } } } } }).__game?.world.level.spec.id))
      .toBe(id);
    await page.waitForTimeout(700);
    const t = await page.evaluate(() => (window as unknown as { __game: { world: { time: number } } }).__game.world.time);
    expect(t, id).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
