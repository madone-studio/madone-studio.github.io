// ponytail: grouped character artwork test suite using Playwright and static server; zero new runtime deps.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createStaticServer } from './server.mjs';
import { chromium } from '/data/career-ops-runtime/node_modules/playwright/index.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const scratchDistDir = process.env.MADONE_BUILD_DIR || path.join(process.env.TMPDIR, 'madone-autoplay', 'coder-dist');

test('Artwork tab: autoplay previews, click to see more, crossfade transitions, dialog viewer and responsive checks', async () => {
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

      // 3. Persistent visible "Click to see more" cues on all 3 cards
      const openButtons = await page.$$('.artwork-card .artwork-open-btn');
      assert.equal(openButtons.length, 3, 'Must have 3 open buttons for the 3 cards');
      for (const btn of openButtons) {
        const text = await btn.innerText();
        assert.ok(text.toLowerCase().includes('click to see more'), `Button must have persistent text "Click to see more", got: "${text}"`);
        const box = await btn.boundingBox();
        assert.ok(box && box.width > 50 && box.height >= 36, 'Click cue button must be visibly rendered');
      }

      // 4. Metadata absent & Toolbar absent (Play/Pause preview UI completely removed)
      assert.equal(await page.$('.artwork-card-title'), null, 'Card title must be absent');
      assert.equal(await page.$('.artwork-card-duration'), null, 'Card duration must be absent');
      assert.equal(await page.$('.artwork-card-badges'), null, 'Card badges must be absent');
      assert.equal(await page.$('.artwork-card-source'), null, 'Card rig/source text must be absent');
      assert.equal(await page.$('.artwork-filters'), null, 'Redundant per-character filter toolbar must be deleted');
      assert.equal(await page.$('.artwork-toolbar'), null, 'Toolbar must be completely deleted');
      assert.equal(await page.$('.artwork-motion-toggle'), null, 'Play/pause preview toggle must be completely deleted');

      // 5. Previews automatically play without user interaction (muted, playsInline)
      await page.waitForFunction(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card video[data-active="true"]'));
        return vids.length === 3 && vids.every((v) => !v.paused && v.currentTime > 0.05 && v.muted);
      }, { timeout: 6000 });

      // 6. Preview playlists restricted to ONLY case-insensitive run/walk/idle in manifest order
      // char1 -> run, walk
      // char2 -> RUN (only 1 item, so loops)
      // char3 -> idle (only 1 item, so loops)
      const char1ActiveVid = await page.$('.artwork-card[data-character="char1"] video[data-active="true"]');
      const char2ActiveVid = await page.$('.artwork-card[data-character="char2"] video[data-active="true"]');
      const char3ActiveVid = await page.$('.artwork-card[data-character="char3"] video[data-active="true"]');

      const char1Src1 = await page.evaluate((v) => v.currentSrc || v.src, char1ActiveVid);
      const char2Src = await page.evaluate((v) => v.currentSrc || v.src, char2ActiveVid);
      const char3Src = await page.evaluate((v) => v.currentSrc || v.src, char3ActiveVid);

      assert.ok(char1Src1.includes('run'), `char1 first clip must be run, got ${char1Src1}`);
      assert.ok(char2Src.includes('RUN') || char2Src.toLowerCase().includes('run'), `char2 clip must be RUN, got ${char2Src}`);
      assert.ok(char3Src.includes('idle'), `char3 clip must be idle, got ${char3Src}`);

      const char2Loop = await page.evaluate((v) => v.loop, char2ActiveVid);
      const char3Loop = await page.evaluate((v) => v.loop, char3ActiveVid);
      assert.equal(char2Loop, true, 'char2 single-preview clip must have loop=true');
      assert.equal(char3Loop, true, 'char3 single-preview clip must have loop=true');

      // Capture char2 currentTime to verify no-other-card-reset rule
      await page.evaluate((v) => { window.__otherReloads = 0; v.addEventListener('loadstart', () => window.__otherReloads++); }, char2ActiveVid);

      // 7. Natural ended transition on char1: crossfade from run -> walk
      // Seek active video near end
      await page.evaluate(async (v) => {
        v.currentTime = v.duration - 0.15;
        if (v.paused) await v.play();
      }, char1ActiveVid);

      // Wait for incoming video to appear and decode (status incoming)
      await page.waitForFunction(() => {
        const incoming = document.querySelector('.artwork-card[data-character="char1"] video[data-incoming="true"]');
        return incoming !== null;
      }, { timeout: 5000 });

      // Check intermediate opacity on incoming frame while outgoing is retained
      const opacities = await page.evaluate(() => {
        const incoming = document.querySelector('.artwork-card[data-character="char1"] video[data-incoming="true"]');
        const outgoing = document.querySelector('.artwork-card[data-character="char1"] video[data-outgoing="true"]');
        return {
          incomingOp: incoming ? parseFloat(window.getComputedStyle(incoming).opacity) : null,
          outgoingOp: outgoing ? parseFloat(window.getComputedStyle(outgoing).opacity) : null
        };
      });

      assert.ok(opacities.incomingOp !== null, 'Incoming video layer must be present during crossfade');
      assert.ok(opacities.outgoingOp !== null && opacities.outgoingOp > 0, 'Outgoing video layer must be retained with opacity > 0 during crossfade');

      // Wait for transition to complete and old layer cleanup
      await page.waitForFunction(() => {
        const card = document.querySelector('.artwork-card[data-character="char1"]');
        const active = card.querySelector('video[data-active="true"]');
        const incoming = card.querySelector('video[data-incoming="true"]');
        return !incoming && active && (active.currentSrc || active.src).includes('walk');
      }, { timeout: 5000 });

      // Check old layer is cleaned up (paused, idle)
      const layersState = await page.evaluate(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card[data-character="char1"] video'));
        const idleVid = vids.find((v) => v.dataset.idle === 'true');
        return {
          totalVideos: vids.length,
          idleIsPaused: idleVid ? idleVid.paused : null
        };
      });
      assert.equal(layersState.totalVideos, 2, 'Two video layers used for crossfade');
      assert.equal(layersState.idleIsPaused, true, 'Idle layer must be paused after transition completes');

      // Verify char2 was not reset or reloaded during char1 transition
      assert.equal(await page.evaluate(() => window.__otherReloads), 0, 'Advancing char1 must not reload char2 (native loop wrap is allowed)');

      // Now seek walk near end to verify wrap-around to run
      const char1WalkVid = await page.$('.artwork-card[data-character="char1"] video[data-active="true"]');
      await page.evaluate(async (v) => {
        v.currentTime = v.duration - 0.15;
        if (v.paused) await v.play();
      }, char1WalkVid);

      await page.waitForFunction(() => {
        const active = document.querySelector('.artwork-card[data-character="char1"] video[data-active="true"]');
        return active && (active.currentSrc || active.src).includes('run');
      }, { timeout: 5000 });

      // 8. Dialog: Open char1 card via "Click to see more" button
      const char1EnlargeBtn = await page.$('.artwork-card[data-character="char1"] .artwork-open-btn');
      await char1EnlargeBtn.click();

      const dialog = await page.$('dialog.artwork-dialog');
      assert.ok(dialog, 'Native dialog element exists');
      assert.ok(await page.evaluate(() => document.querySelector('dialog.artwork-dialog')?.open), 'Dialog is open');

      // Select element exists with default 'auto' mode and 11 options for char1
      const select = await page.$('#artwork-animation');
      assert.ok(select, 'Native select #artwork-animation exists');
      assert.equal(await page.evaluate(() => document.getElementById('artwork-animation')?.value), 'auto');

      const char1Options = await page.$$eval('#artwork-animation option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.textContent.trim() }))
      );
      assert.equal(char1Options.length, 11, 'char1 dialog select must have 1 auto + 10 animation options');
      assert.equal(char1Options[0].value, 'auto');

      // Dialog video autoplays muted
      await page.waitForFunction(() => {
        const v = document.querySelector('dialog.artwork-dialog video[data-active="true"]');
        return v && !v.paused && v.muted;
      }, { timeout: 5000 });

      // 9. Dialog auto sequential playback with STABLE FOCUS
      await page.focus('#artwork-animation');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'artwork-animation');

      const dialogActiveVid = await page.$('dialog.artwork-dialog video[data-active="true"]');
      await page.evaluate(async (v) => {
        v.currentTime = v.duration - 0.15;
        if (v.paused) await v.play();
      }, dialogActiveVid);

      // Wait for auto advance in dialog
      await page.waitForFunction(() => {
        const v = document.querySelector('dialog.artwork-dialog video[data-active="true"]');
        return v && !(v.currentSrc || v.src).includes('run');
      }, { timeout: 5000 });

      // Verify focus remained stable on select element
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'artwork-animation',
        'Focus must not be stolen during auto sequential advances');

      // 10. Explicit animation selection loops
      await page.selectOption('#artwork-animation', 'char1-dead');

      // Wait for crossfade to char1-dead
      await page.waitForFunction(() => {
        const v = document.querySelector('dialog.artwork-dialog video[data-active="true"]');
        return v && (v.currentSrc || v.src).includes('dead');
      }, { timeout: 5000 });

      const deadLoop = await page.evaluate(() => {
        const v = document.querySelector('dialog.artwork-dialog video[data-active="true"]');
        return v ? v.loop : false;
      });
      assert.equal(deadLoop, true, 'Explicitly selected animation must have loop=true');

      // 11. Rapid manual selections without stale callbacks or stuck layers
      await page.selectOption('#artwork-animation', 'char1-attack');
      await page.selectOption('#artwork-animation', 'char1-skill');
      await page.selectOption('#artwork-animation', 'char1-walk');

      await page.waitForFunction(() => {
        const v = document.querySelector('dialog.artwork-dialog video[data-active="true"]');
        const incoming = document.querySelector('dialog.artwork-dialog video[data-incoming="true"]');
        return !incoming && v && (v.currentSrc || v.src).includes('walk');
      }, { timeout: 5000 });

      const dialogLayerCount = await page.evaluate(() => {
        const vids = Array.from(document.querySelectorAll('dialog.artwork-dialog video'));
        const playingVids = vids.filter((v) => !v.paused);
        return { total: vids.length, playingCount: playingVids.length };
      });
      assert.equal(dialogLayerCount.total, 2, 'Dialog uses 2 video layers');
      assert.equal(dialogLayerCount.playingCount, 1, 'Only the active layer is playing after rapid selections');

      // 12. Close dialog via Escape key & check focus return
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.artwork-dialog')?.open);

      const isFocusedOnTrigger = await page.evaluate(() => {
        const btn = document.querySelector('.artwork-card[data-character="char1"] .artwork-open-btn');
        return document.activeElement === btn;
      });
      assert.ok(isFocusedOnTrigger, 'Focus must return to trigger button after dialog closes');

      // 13. Dialog options coverage for char2 (17) and char3 (1) -> total 28 across modal
      const char2EnlargeBtn = await page.$('.artwork-card[data-character="char2"] .artwork-open-btn');
      await char2EnlargeBtn.click();
      await page.waitForFunction(() => document.querySelector('dialog.artwork-dialog')?.open);
      const char2Options = await page.$$eval('#artwork-animation option', (opts) => opts.map((o) => o.value));
      assert.equal(char2Options.length, 18, 'char2 must have 1 auto + 17 animation options (total 18)');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.artwork-dialog')?.open);

      const char3EnlargeBtn = await page.$('.artwork-card[data-character="char3"] .artwork-open-btn');
      await char3EnlargeBtn.click();
      await page.waitForFunction(() => document.querySelector('dialog.artwork-dialog')?.open);
      const char3Options = await page.$$eval('#artwork-animation option', (opts) => opts.map((o) => o.value));
      assert.equal(char3Options.length, 2, 'char3 must have 1 auto + 1 animation option (total 2)');
      await page.click('dialog.artwork-dialog', { position: { x: 5, y: 5 } });
      await page.waitForFunction(() => !document.querySelector('dialog.artwork-dialog')?.open);

      // Total animations count = (11-1) + (18-1) + (2-1) = 10 + 17 + 1 = 28
      assert.equal((char1Options.length - 1) + (char2Options.length - 1) + (char3Options.length - 1), 28, 'All 28 animations available across modals');

      // 14. Error state & Retry on card without resetting other cards
      await page.waitForSelector('.artwork-card[data-character="char1"] video[data-active="true"]');
      await page.evaluate(() => {
        const card1 = document.querySelector('.artwork-card[data-character="char1"]');
        const activeVid = card1.querySelector('video[data-active="true"]');
        activeVid.dispatchEvent(new Event('error'));
      });

      await page.waitForSelector('.artwork-card[data-character="char1"] .artwork-error-state');
      assert.ok(await page.$('.artwork-card[data-character="char1"] .artwork-btn-retry'), 'Retry button appears on error');

      // Check char2 and char3 are NOT in error state
      assert.equal(await page.$('.artwork-card[data-character="char2"] .artwork-error-state'), null);
      assert.equal(await page.$('.artwork-card[data-character="char3"] .artwork-error-state'), null);

      // Click retry
      await page.click('.artwork-card[data-character="char1"] .artwork-btn-retry');
      await page.waitForFunction(() => {
        const card1 = document.querySelector('.artwork-card[data-character="char1"]');
        return !card1.querySelector('.artwork-error-state') && card1.querySelector('video[data-active="true"]');
      });

      // 15. Document visibility: pause on hidden, resume on visible
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await page.waitForFunction(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card video[data-active="true"]'));
        return vids.every((v) => v.paused);
      }, { timeout: 3000 });

      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await page.waitForFunction(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card video[data-active="true"]'));
        return vids.every((v) => !v.paused);
      }, { timeout: 3000 });

      // 16. Back / Forward navigation
      await page.goBack();
      await page.waitForTimeout(300);
      assert.ok(await page.$('section#home'), 'Browser back should restore homepage sections');

      await page.goForward();
      await page.waitForTimeout(300);
      assert.ok(await page.$('section#artwork'), 'Browser forward should return to #artwork');

      // 17. Direct refresh at #artwork
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

      // Touch journey: open dialog, inspect touch target dimensions (min 40x40px)
      await page.locator('.artwork-open-btn').first().click();
      await page.waitForFunction(() => document.querySelector('dialog.artwork-dialog')?.open);

      for (const selector of ['.artwork-dialog-close', '.artwork-dialog-footer button', '#artwork-animation']) {
        const el = page.locator(selector).first();
        const box = await el.boundingBox();
        assert.ok(box, `${vp.name}: ${selector} must have bounding box`);
        assert.ok(box.width >= 40 && box.height >= 40, `${vp.name}: ${selector} touch target adequate (${box.width}x${box.height})`);
      }

      await page.locator('.artwork-dialog-close').click();
      await page.waitForTimeout(150);

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

      // Autoplay is STILL active even under reduced-motion (explicit user request)
      await page.waitForFunction(() => {
        const vids = Array.from(document.querySelectorAll('.artwork-card video[data-active="true"]'));
        return vids.length === 3 && vids.every((v) => !v.paused);
      }, { timeout: 5000 });

      // Decorative fades removed/shortened (duration <= 150ms or 0ms)
      const fadeDuration = await page.evaluate(() => {
        const section = document.querySelector('.artwork-section');
        return getComputedStyle(section).getPropertyValue('--artwork-fade-duration').trim();
      });
      assert.ok(fadeDuration === '0s' || fadeDuration === '0ms' || parseInt(fadeDuration, 10) <= 150,
        `Reduced motion fade duration must be <= 150ms or instant, got ${fadeDuration}`);

      await context.close();
    }

    console.log('ALL PLAYWRIGHT TESTS PASSED (GREEN)!');
  } finally {
    await browser.close();
    server.close();
  }
});