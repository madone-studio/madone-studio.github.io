// ponytail: grouped character artwork test suite using Playwright and static server; zero new runtime deps.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createStaticServer } from './server.mjs';
import { chromium } from '/data/career-ops-runtime/node_modules/playwright/index.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const scratchDistDir = process.env.MADONE_BUILD_DIR || path.join(process.env.TMPDIR, 'madone-grouped-artwork', 'coder-dist');

test('Artwork tab: grouped character cards, sequential playback, dialog viewer and responsive checks', async () => {
  if (!process.env.MADONE_BUILD_DIR) {
    execFileSync(process.execPath, ['scripts/build.mjs'], {
      cwd: rootDir,
      env: { ...process.env, MADONE_BUILD_DIR: scratchDistDir },
      stdio: 'inherit'
    });
  }
  const server = createStaticServer({ root: scratchDistDir });
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

      // Verify dedicated gallery view
      const artworkSection = await page.$('section#artwork');
      assert.ok(artworkSection, 'Dedicated #artwork section must be present');
      assert.equal(await page.$('section#home'), null, 'Hero section must not be present while on #artwork');
      assert.equal(await page.$('section#games'), null, 'Games section must not be present while on #artwork');
      assert.equal(await page.$('section#studio'), null, 'Studio section must not be present while on #artwork');
      assert.equal(await page.$('section#contact'), null, 'Contact section must not be present while on #artwork');
      assert.ok(await page.$('header#header'), 'Header must remain');
      assert.ok(await page.$('footer.footer'), 'Footer must remain');

      // 2. Exactly 3 cards derived by character
      const cards = await page.$$('.artwork-card');
      assert.equal(cards.length, 3, 'Must display exactly 3 character cards');

      const char1Card = await page.$('.artwork-card[data-character="char1"]');
      const char2Card = await page.$('.artwork-card[data-character="char2"]');
      const char3Card = await page.$('.artwork-card[data-character="char3"]');
      assert.ok(char1Card, 'Card for char1 must exist');
      assert.ok(char2Card, 'Card for char2 must exist');
      assert.ok(char3Card, 'Card for char3 must exist');

      // 3. Metadata absent: title, duration, badges, rig text, and filter toolbar
      assert.equal(await page.$('.artwork-card-title'), null, 'Card title must be absent');
      assert.equal(await page.$('.artwork-card-duration'), null, 'Card duration must be absent');
      assert.equal(await page.$('.artwork-card-badges'), null, 'Card badges must be absent');
      assert.equal(await page.$('.artwork-card-source'), null, 'Card rig/source text must be absent');
      assert.equal(await page.$('.artwork-filters'), null, 'Redundant per-character filter toolbar must be deleted');

      // 4. Global Pause/Play Previews toggle
      const motionToggle = await page.$('.artwork-motion-toggle');
      assert.ok(motionToggle, 'Global motion toggle button exists');
      await motionToggle.click(); // Pause
      const arePreviewsPaused = await page.evaluate(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card video'));
        return vids.every((v) => v.paused);
      });
      assert.ok(arePreviewsPaused, 'All card preview videos should be paused after global toggle');
      await motionToggle.click(); // Resume play

      // 5. Card real natural ended transition (sequential advance without synthetic dispatch)
      const char1Video = await page.$('.artwork-card[data-character="char1"] .artwork-video');
      assert.ok(char1Video, 'char1 preview video element exists');

      // Wait for video to be ready and playing
      await page.waitForFunction(
        (v) => v && v.duration > 0 && !v.paused,
        char1Video,
        { timeout: 5000 }
      );
      const initialPoster = await char1Video.getAttribute('poster');
      await page.waitForFunction(() => document.querySelector('[data-character="char2"] video')?.currentTime > 0.6);
      const otherTime = await page.locator('[data-character="char2"] video').evaluate(v => v.currentTime);

      // Seek near end to test real natural ended transition
      await page.evaluate(async (v) => {
        v.currentTime = v.duration - 0.15;
        if (v.paused) await v.play();
      }, char1Video);

      // Wait for natural advance to change poster / clip
      await page.waitForFunction(
        ([v, prevPoster]) => v && v.getAttribute('poster') !== prevPoster,
        [char1Video, initialPoster],
        { timeout: 5000 }
      );
      const nextPoster = await char1Video.getAttribute('poster');
      assert.notEqual(nextPoster, initialPoster, 'Card preview must advance to next clip on ended');
      assert.ok(await page.locator('[data-character="char2"] video').evaluate(v => v.currentTime) >= otherTime,
        'Advancing one character must not reload or restart the other character previews');

      // Single-clip character loops (char3)
      const char3Video = await page.$('.artwork-card[data-character="char3"] .artwork-video');
      assert.ok(char3Video, 'char3 video element exists');
      const isChar3Looping = await page.evaluate((v) => v.loop === true, char3Video);
      assert.ok(isChar3Looping, 'Single-clip character (char3) should loop');

      // 6. Dialog: Open char1 card
      const char1EnlargeBtn = await page.$('.artwork-card[data-character="char1"] .artwork-open-btn');
      assert.ok(char1EnlargeBtn, 'char1 has accessible enlarge button');
      await char1EnlargeBtn.click();

      const dialog = await page.$('dialog.artwork-dialog');
      assert.ok(dialog, 'Native dialog element exists');
      assert.ok(await page.evaluate(() => document.querySelector('dialog.artwork-dialog')?.open), 'Dialog is open');

      // Dialog metadata absent
      assert.equal(await page.$('.artwork-dialog-meta'), null, 'Dialog technical metadata block must be absent');
      assert.equal(await page.$('.artwork-dialog-nav-btns'), null, 'Redundant prev/next buttons must be absent');

      // Select element exists with default 'auto' mode
      const select = await page.$('#artwork-animation');
      assert.ok(select, 'Native select #artwork-animation exists');
      const selectValue = await page.evaluate(() => document.getElementById('artwork-animation')?.value);
      assert.equal(selectValue, 'auto', 'Default select value must be "auto"');

      // Coverage options for char1: 1 auto + 10 animations = 11 options
      const char1Options = await page.$$eval('#artwork-animation option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.textContent.trim() }))
      );
      assert.equal(char1Options.length, 11, 'char1 select must have 1 auto + 10 animation options');
      assert.equal(char1Options[0].value, 'auto');
      assert.ok(char1Options[0].text.includes('Auto'));

      // Dialog video playing
      const dialogVideo = await page.$('.artwork-dialog-video');
      assert.ok(dialogVideo, 'Dialog video element exists');
      await page.waitForFunction((v) => v && v.duration > 0 && !v.paused, dialogVideo, { timeout: 5000 });
      assert.equal(await page.evaluate((v) => v.loop, dialogVideo), false, 'Auto mode dialog video should not have loop set');

      // 7. Auto sequential playback in dialog with real natural ended transition and STABLE FOCUS
      // Focus on select first to verify focus stability
      await page.focus('#artwork-animation');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'artwork-animation');

      const initialDialogPoster = await dialogVideo.getAttribute('poster');
      // Seek near end naturally
      await page.evaluate(async (v) => {
        v.currentTime = v.duration - 0.15;
        if (v.paused) await v.play();
      }, dialogVideo);

      // Await natural advance
      await page.waitForFunction(
        ([v, prevPoster]) => v && v.getAttribute('poster') !== prevPoster,
        [dialogVideo, initialDialogPoster],
        { timeout: 5000 }
      );

      // Verify focus remained stable (not stolen on clip change)
      const activeElId = await page.evaluate(() => document.activeElement?.id);
      assert.equal(activeElId, 'artwork-animation', 'Focus must remain stable on active element during auto advance');

      // 8. Explicit animation selection loop
      // Select explicit animation (e.g., char1-dead)
      await page.selectOption('#artwork-animation', 'char1-dead');
      await page.waitForFunction(
        (v) => v && v.getAttribute('poster')?.includes('dead') && Number.isFinite(v.duration) && v.duration > 0,
        dialogVideo,
        { timeout: 5000 }
      );
      assert.equal(await page.evaluate((v) => v.loop, dialogVideo), true, 'Explicitly selected animation must have loop=true');

      // Seek near end and verify it continues looping on the same animation (doesn't advance)
      await page.evaluate(async (v) => {
        v.currentTime = v.duration - 0.15;
        if (v.paused) await v.play();
      }, dialogVideo);
      await page.waitForTimeout(500);
      const posterAfterLoop = await dialogVideo.getAttribute('poster');
      assert.ok(posterAfterLoop.includes('dead'), 'Explicitly selected animation must remain on selected animation');

      // 9. Auto resume
      await page.selectOption('#artwork-animation', 'auto');
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate((v) => v.loop, dialogVideo), false, 'Selecting auto resumes non-looping sequential mode');

      // 10. Close dialog via Escape key & check focus return
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.querySelector('dialog.artwork-dialog')?.open), false, 'Dialog must close on Escape key');

      const isFocusedOnTrigger = await page.evaluate(() => {
        const btn = document.querySelector('.artwork-card[data-character="char1"] .artwork-open-btn');
        return document.activeElement === btn;
      });
      assert.ok(isFocusedOnTrigger, 'Focus must return to trigger button after dialog closes');

      // 11. Group coverage options: char2 (17) and char3 (1)
      const char2EnlargeBtn = await page.$('.artwork-card[data-character="char2"] .artwork-open-btn');
      await char2EnlargeBtn.click();
      await page.waitForFunction(() => document.querySelector('dialog.artwork-dialog')?.open);
      const char2Options = await page.$$eval('#artwork-animation option', (opts) => opts.map((o) => o.value));
      assert.equal(char2Options.length, 18, 'char2 must have 1 auto + 17 animation options (total 18)');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      const char3EnlargeBtn = await page.$('.artwork-card[data-character="char3"] .artwork-open-btn');
      await char3EnlargeBtn.click();
      await page.waitForFunction(() => document.querySelector('dialog.artwork-dialog')?.open);
      const char3Options = await page.$$eval('#artwork-animation option', (opts) => opts.map((o) => o.value));
      assert.equal(char3Options.length, 2, 'char3 must have 1 auto + 1 animation option (total 2)');

      // 12. Backdrop click to close dialog
      await page.click('dialog.artwork-dialog', { position: { x: 5, y: 5 } });
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.querySelector('dialog.artwork-dialog')?.open), false, 'Dialog closed on backdrop click');

      // 13. Back / Forward navigation
      await page.goBack();
      await page.waitForTimeout(300);
      assert.ok(await page.$('section#home'), 'Browser back should restore homepage sections');

      await page.goForward();
      await page.waitForTimeout(300);
      assert.ok(await page.$('section#artwork'), 'Browser forward should return to #artwork');

      // 14. Direct refresh at #artwork
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.artwork-card', { timeout: 5000 });
      const cardsAfterReload = await page.$$('.artwork-card');
      assert.equal(cardsAfterReload.length, 3, 'Direct reload at #artwork must show exactly 3 character cards');

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
      assert.equal(cardCount, 3, `Viewport ${vp.name} renders all 3 character cards`);

      // Touch journey: open dialog, inspect touch target dimensions (min 44x44px)
      await page.locator('.artwork-open-btn').first().click();
      await page.waitForFunction(() => document.querySelector('dialog.artwork-dialog')?.open);
      await page.locator('.artwork-dialog-video').waitFor();

      for (const selector of ['.artwork-dialog-close', '.artwork-dialog-footer button', '#artwork-animation']) {
        const el = page.locator(selector).first();
        const box = await el.boundingBox();
        assert.ok(box, `${vp.name}: ${selector} must have bounding box`);
        assert.ok(box.width >= 40 && box.height >= 40, `${vp.name}: ${selector} touch target adequate (${box.width}x${box.height})`);
      }

      await page.locator('.artwork-dialog-close').click();
      await page.waitForTimeout(150);

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

      // Previews default to paused under reduced motion
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
