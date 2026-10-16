// ponytail: artwork test suite using Playwright and scratch UI build; zero new runtime deps.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createStaticServer } from './server.mjs';
import { chromium } from '/data/career-ops-runtime/node_modules/playwright/index.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const scratchDistDir = process.env.MADONE_BUILD_DIR || path.join(process.env.TMPDIR, 'madone-artwork', 'ui-dist');

test('Artwork tab: production artifact navigation, playback, modal and responsive checks', async () => {
  if (!process.env.MADONE_BUILD_DIR) execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd: rootDir, env: { ...process.env, MADONE_BUILD_DIR: scratchDistDir }, stdio: 'inherit'
  });
  const server = createStaticServer({root: scratchDistDir});
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = process.env.MADONE_ORIGIN || `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // --- Test A: Desktop 1280x800 ---
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));
      page.on('response', (res) => {
        if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
      });
      page.on('requestfailed', (req) => {
        const url = req.url();
        const errText = req.failure()?.errorText || 'failed';
        if (url.startsWith(baseUrl) && errText !== 'net::ERR_ABORTED') {
          failedRequests.push(`${req.method()} ${url} -> ${errText}`);
        }
      });

      // 1. Visit homepage
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#root > *', { timeout: 5000 });

      // Nav link exists
      const artworkNavLink = await page.$('a[href="#artwork"]');
      assert.ok(artworkNavLink, 'Header nav link for #artwork must exist');

      const footerArtworkLink = await page.$('footer a[href="#artwork"]');
      assert.ok(footerArtworkLink, 'Footer quick link for #artwork must exist');

      // Click nav link
      await artworkNavLink.click();
      await page.waitForURL(`${baseUrl}/#artwork`, { timeout: 3000 });

      // Verify dedicated gallery view (no old hero/games/studio/contact underneath)
      const artworkSection = await page.$('section#artwork');
      assert.ok(artworkSection, 'Dedicated #artwork section must be present');
      assert.equal(await page.$('section#home'), null, 'Hero section must not be present while on #artwork');
      assert.equal(await page.$('section#games'), null, 'Games section must not be present while on #artwork');
      assert.equal(await page.$('section#studio'), null, 'Studio section must not be present while on #artwork');
      assert.equal(await page.$('section#contact'), null, 'Contact section must not be present while on #artwork');
      assert.ok(await page.$('header#header'), 'Header must remain');
      assert.ok(await page.$('footer.footer'), 'Footer must remain');

      // 28 cards unfiltered
      const cards = await page.$$('.artwork-card');
      assert.equal(cards.length, 28, 'Must display exactly 28 artwork cards unfiltered');

      // Filter tests: Character 01 (10), Character 02 (17), Character 03 (1), All (28)
      const filterChar1 = await page.$('button[data-filter="char1"]');
      assert.ok(filterChar1, 'Filter for Character 01 exists');
      await filterChar1.click();
      let char1Cards = await page.$$('.artwork-card:visible');
      assert.equal(char1Cards.length, 10, 'Character 01 filter must show 10 cards');

      const filterChar2 = await page.$('button[data-filter="char2"]');
      assert.ok(filterChar2, 'Filter for Character 02 exists');
      await filterChar2.click();
      let char2Cards = await page.$$('.artwork-card:visible');
      assert.equal(char2Cards.length, 17, 'Character 02 filter must show 17 cards');

      const filterChar3 = await page.$('button[data-filter="char3"]');
      assert.ok(filterChar3, 'Filter for Character 03 exists');
      await filterChar3.click();
      let char3Cards = await page.$$('.artwork-card:visible');
      assert.equal(char3Cards.length, 1, 'Character 03 filter must show 1 card');

      const filterAll = await page.$('button[data-filter="all"]');
      assert.ok(filterAll, 'Filter for All exists');
      await filterAll.click();
      let allCards = await page.$$('.artwork-card:visible');
      assert.equal(allCards.length, 28, 'All filter must show 28 cards');

      // Test Global Pause/Play Previews toggle
      const motionToggle = await page.$('.artwork-motion-toggle');
      assert.ok(motionToggle, 'Global motion toggle button exists');
      await motionToggle.click(); // Pause
      const arePreviewsPaused = await page.evaluate(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card video'));
        return vids.every((v) => v.paused);
      });
      assert.ok(arePreviewsPaused, 'All card preview videos should be paused after global toggle');
      await motionToggle.click(); // Resume play

      // Dialog test: Open first card
      const firstCardButton = await page.$('.artwork-card button.artwork-open-btn');
      assert.ok(firstCardButton, 'Artwork card has an accessible button to open dialog');
      await firstCardButton.click();

      // Check dialog
      const dialog = await page.$('dialog.artwork-dialog');
      assert.ok(dialog, 'Native dialog must exist');
      const isOpen = await page.evaluate(() => {
        const d = document.querySelector('dialog.artwork-dialog');
        return d && d.open;
      });
      assert.ok(isOpen, 'Dialog must be open');

      // Check dialog title, animation info, source info
      const dialogTitle = await page.textContent('.artwork-dialog-title');
      assert.ok(dialogTitle && dialogTitle.trim().length > 0, 'Dialog displays title');
      const dialogMeta = await page.textContent('.artwork-dialog-meta');
      assert.ok(dialogMeta && dialogMeta.includes('cha_51001'), 'Dialog displays rig/source name');

      // Check video playback progression in dialog
      await page.waitForTimeout(600);
      const videoState = await page.evaluate(() => {
        const v = document.querySelector('dialog.artwork-dialog video');
        return v ? { currentTime: v.currentTime, readyState: v.readyState, paused: v.paused } : null;
      });
      assert.ok(videoState, 'Video element exists in dialog');
      assert.ok(videoState.currentTime > 0, `Video time should progress on real media, got: ${videoState?.currentTime}`);
      assert.equal(videoState.paused, false, 'Video should be actively playing in dialog');

      // Test Step Next button in dialog
      const nextBtn = await page.$('button[aria-label="Next animation"]');
      assert.ok(nextBtn, 'Next button exists in dialog');
      await nextBtn.click();
      const secondDialogTitle = await page.textContent('.artwork-dialog-title');
      assert.notEqual(secondDialogTitle, dialogTitle, 'Dialog stepped to next animation');

      // Close dialog via Escape key & check focus restoration
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const isClosedEscape = await page.evaluate(() => {
        const d = document.querySelector('dialog.artwork-dialog');
        return !d || !d.open;
      });
      assert.ok(isClosedEscape, 'Dialog must close on Escape key');

      const isFocusedOnTrigger = await page.evaluate(() => {
        const btn = document.querySelector('.artwork-card button.artwork-open-btn');
        return document.activeElement === btn;
      });
      assert.ok(isFocusedOnTrigger, 'Focus must return to the trigger button after dialog closes');

      // Test Backdrop click to close dialog
      await firstCardButton.click();
      await page.waitForTimeout(200);
      assert.ok(await page.evaluate(() => document.querySelector('dialog.artwork-dialog')?.open), 'Dialog reopened');
      // Click outside dialog content (on backdrop)
      await page.click('dialog.artwork-dialog', { position: { x: 5, y: 5 } });
      await page.waitForTimeout(200);
      const isClosedBackdrop = await page.evaluate(() => !document.querySelector('dialog.artwork-dialog')?.open);
      assert.ok(isClosedBackdrop, 'Dialog closed on backdrop click');

      // Test Back / Forward navigation
      await page.goBack();
      await page.waitForTimeout(300);
      assert.ok(await page.$('section#home'), 'Browser back should restore homepage sections');

      await page.goForward();
      await page.waitForTimeout(300);
      assert.ok(await page.$('section#artwork'), 'Browser forward should return to #artwork');

      // Test direct refresh at #artwork
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.artwork-card', { timeout: 5000 });
      const cardsAfterReload = await page.$$('.artwork-card');
      assert.equal(cardsAfterReload.length, 28, 'Direct reload at #artwork must show 28 cards');

      // Zero console errors & HTTP failures
      assert.deepEqual(consoleErrors, [], `Console errors encountered: ${consoleErrors.join(', ')}`);
      assert.deepEqual(failedRequests, [], `Failed requests: ${failedRequests.join(', ')}`);

      await context.close();
    }

    // --- Test B: Responsive Viewports (390 mobile, 320 small, 844x390 landscape) ---
    for (const vp of [
      { name: 'Mobile 390x844', width: 390, height: 844 },
      { name: 'Mobile 320x568', width: 320, height: 568 },
      { name: 'Landscape 844x390', width: 844, height: 390 }
    ]) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/#artwork`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.artwork-card', { timeout: 5000 });

      // No horizontal scrollbar / overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      assert.equal(hasOverflow, false, `Viewport ${vp.name} must not have horizontal overflow`);

      const cardCount = await page.$$eval('.artwork-card', (els) => els.length);
      assert.equal(cardCount, 28, `Viewport ${vp.name} renders all 28 cards`);
      // Exercise the touch/keyboard journey too, not just the page's scrollWidth.
      await page.locator('.artwork-open-btn').first().click();
      await page.waitForFunction(() => document.querySelector('dialog.artwork-dialog')?.open);
      await page.locator('.artwork-dialog-video').waitFor();
      await page.waitForFunction(() => document.querySelector('.artwork-dialog-video')?.currentTime > 0);
      for (const selector of ['.artwork-dialog-close', '.artwork-dialog-footer button']) {
        for (const button of await page.locator(selector).all()) {
          const box = await button.boundingBox();
          assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width + 1 && box.y + box.height <= vp.height + 1, `${vp.name}: reachable dialog control`);
        }
      }
      await page.locator('.artwork-dialog-close').click();
      if (await page.locator('#nav-toggle').isVisible()) await page.locator('#nav-toggle').click();
      await page.locator('header a[href="#games"]').click();
      await page.locator('.game-card').first().waitFor();
      assert.equal(await page.locator('.artwork-card').count(), 0);
      await context.close();
    }

    // --- Test C: prefers-reduced-motion ---
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        reducedMotion: 'reduce'
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/#artwork`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.artwork-card', { timeout: 5000 });

      // Cards should default to paused previews under reduced motion
      const allPaused = await page.evaluate(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card video'));
        return vids.every((v) => v.paused);
      });
      assert.ok(allPaused, 'Under prefers-reduced-motion, card preview videos must default to paused');
      await context.close();
    }

    console.log('ALL PLAYWRIGHT TESTS PASSED (GREEN)!');
  } finally {
    await browser.close();
    server.close();
  }
});
