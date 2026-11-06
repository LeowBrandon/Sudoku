const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:3000');
    await page.waitForFunction(() => state.playing);
    assert.equal(await page.locator('.cell').count(), 81);
    assert.equal(await page.locator('.star').count(), 40);
    assert.equal(await page.locator('.diff-btn.active').getAttribute('data-diff'), 'easy');
    assert.equal(await page.locator('.given').count(), 42);
    await page.screenshot({ path: '/tmp/neon-desktop.png', fullPage: true });
    let data = await page.evaluate(() => ({ i: state.grid.findIndex(n => !n), solution: state.solution }));
    const correct = data.solution[data.i], wrong = correct === 9 ? 1 : correct + 1;
    await page.locator('.cell').nth(data.i).click();
    await page.locator('#noteBtn').click();
    await page.keyboard.press(String(correct));
    assert.equal(await page.locator('.cell').nth(data.i).locator('.notes').textContent(), String(correct));
    await page.keyboard.press(String(correct));
    assert.equal(await page.locator('.cell').nth(data.i).textContent(), '');
    await page.keyboard.press(String(correct));
    await page.locator('#eraseBtn').click();
    assert.equal(await page.locator('.cell').nth(data.i).textContent(), '');
    await page.locator('#noteBtn').click();
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true })));
    assert.equal(await page.evaluate(() => state.errors), 0);
    await page.keyboard.press(String(wrong));
    assert.equal(await page.locator('#errValue').textContent(), '1 / 3');
    assert.match(await page.locator('#toast').textContent(), /答案错误/);
    assert.equal(await page.locator('.cell').nth(data.i).textContent(), '');
    await page.keyboard.press(String(correct));
    assert.equal(await page.locator('.cell').nth(data.i).textContent(), String(correct));
    await page.locator('#eraseBtn').click();
    await page.locator('#hintBtn').click();
    assert.equal(await page.locator('.cell').nth(data.i).textContent(), String(correct));
    assert.equal(await page.locator('#hintBadge').textContent(), '2');
    data = await page.evaluate(() => ({ i: state.grid.findIndex(n => !n), solution: state.solution }));
    await page.locator('.cell').nth(data.i).click();
    for (let j = 0; j < 2; j++) await page.keyboard.press(String(data.solution[data.i] === 9 ? 1 : data.solution[data.i] + 1));
    assert.equal(await page.locator('#failModal').evaluate(e => e.classList.contains('show')), true);
    assert.equal(await page.evaluate(() => state.playing), false);
    await page.locator('#failAgainBtn').click();
    await page.waitForFunction(() => state.playing);
    assert.equal(await page.locator('#errValue').textContent(), '0 / 3');
    for (const [level, count] of [['easy',42], ['medium',34], ['hard',27], ['expert',23], ['hell',19], ['dream',17]]) {
      await page.locator(`[data-diff="${level}"]`).click();
      await page.waitForFunction(diff => state.playing && state.diff === diff && !document.getElementById('loadingOverlay').classList.contains('show'), level);
      assert.equal(await page.locator('.given').count(), count);
    }
    // Overlapping asynchronous generations must leave the newest game active.
    await page.evaluate(() => Promise.all([newGame('easy'), newGame('dream')]));
    assert.equal(await page.locator('.given').count(), 17);
    assert.equal(await page.locator('#diffValue').textContent(), '梦寐');
    const game = await page.evaluate(() => ({ grid: state.grid, solution: state.solution }));
    for (let i = 0; i < 81; i++) if (!game.grid[i]) {
      await page.locator('.cell').nth(i).click(); await page.keyboard.press(String(game.solution[i]));
    }
    assert.equal(await page.locator('#winModal').evaluate(e => e.classList.contains('show')), true);
    assert.equal(await page.locator('#winDiff').textContent(), '梦寐');
    assert.equal(await page.evaluate(() => state.playing), false);
    const time = await page.locator('#timeValue').textContent(); await page.waitForTimeout(1100);
    assert.equal(await page.locator('#timeValue').textContent(), time);
    await page.screenshot({ path: '/tmp/neon-win.png', fullPage: true });
    await page.locator('#winAgainBtn').click(); await page.waitForFunction(() => state.playing);
    assert.equal(await page.locator('#confettiCanvas').isVisible(), false);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/neon-mobile.png', fullPage: true });
    data = await page.evaluate(() => ({ i: state.grid.findIndex(n => !n) }));
    await page.locator('.cell').nth(data.i).focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => state.selected), data.i);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.cell:focus').count(), 1);
    await page.locator('#noteBtn').click();
    await page.locator('.key').nth(2).click();
    assert.equal(await page.evaluate(() => state.notes[state.selected].has(3)), true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => launchConfetti());
    assert.equal(await page.locator('#confettiCanvas').isVisible(), false);
    assert.equal(await page.locator('.star').first().evaluate(e => getComputedStyle(e).animationName), 'none');
    assert.deepEqual(errors, []);
    console.log('PASS: initial state, 40 stars, notes, erase, shortcut guard, warnings, hints, three-error loss, retry, all six clue counts, generation race, 17-clue win, stopped timer, effect cleanup, mobile layouts, keyboard and touch input; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
