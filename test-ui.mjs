// ponytail: UI browser verification using existing runtime Playwright & server.mjs export; zero extra dependencies.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/data/career-ops-runtime/node_modules/playwright/index.mjs';
import { createStaticServer } from './server.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(process.env.MADONE_BUILD_DIR || path.join(rootDir, 'dist'));

test('Playwright UI suite: desktop 1280 & mobile 390, React root, 6 cards, 3 team, modal dialog, mailto validation, zero local network errors', async () => {
  const server = createStaticServer({ root: distDir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = process.env.MADONE_ORIGIN || `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // --- 1. DESKTOP VIEWPORT (1280x800) ---
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      const consoleErrors = [];
      const localFailures = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));
      page.on('requestfailed', (req) => {
        const url = req.url();
        if (url.startsWith(baseUrl)) {
          localFailures.push(`${req.method()} ${url} -> ${req.failure()?.errorText || 'failed'}`);
        }
      });

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#root > *', { timeout: 5000 });

      // Local asset failure check
      assert.deepEqual(localFailures, [], 'Zero local asset 404/network failures');

      // React Root mounted
      const rootHtml = await page.innerHTML('#root');
      assert.ok(rootHtml.length > 500, 'React root rendered markup');

      // Nav anchors exist
      for (const hash of ['#home', '#games', '#studio', '#contact']) {
        const link = await page.$(`a[href="${hash}"]`);
        assert.ok(link, `Navigation link for ${hash} exists`);
      }

      // Check Sections exist
      assert.ok(await page.$('section#home'), '#home section exists');
      assert.ok(await page.$('section#games'), '#games section exists');
      assert.ok(await page.$('section#studio'), '#studio section exists');
      assert.ok(await page.$('section#contact'), '#contact section exists');
      assert.ok(await page.$('footer.footer'), 'footer exists');

      // Check Games: exactly 6 cards
      const gameCards = await page.$$('.game-card');
      assert.equal(gameCards.length, 6, 'Exactly 6 game cards rendered');

      // Check Archero and SurvivorIO play buttons
      const archeroPlay = await page.$('a[href="/Games/Archero/index.html"]');
      assert.ok(archeroPlay, 'Archero has playable link to /Games/Archero/index.html');

      const survivorPlay = await page.$('a[href="/Games/SurvivorIO/index.html"]');
      assert.ok(survivorPlay, 'SurvivorIO has playable link to /Games/SurvivorIO/index.html');

      // Check other 4 games have unavailable status instead of dead fake links
      const unavailablePlayButtons = await page.$$('.game-card .btn-unavailable');
      assert.equal(unavailablePlayButtons.length, 4, '4 games have unavailable label');

      // Check Details Modal dialog
      const firstCard = await page.$('.game-card:nth-child(1)');
      await firstCard.hover();
      const archeroDetailsBtn = await page.$('.game-card:nth-child(1) button.btn-outline');
      assert.ok(archeroDetailsBtn, 'Details button exists on first card');
      await archeroDetailsBtn.click();

      // Modal is visible
      const modal = await page.waitForSelector('[role="dialog"][aria-modal="true"]', { timeout: 3000 });
      assert.ok(modal, 'Modal dialog opened with role="dialog"');
      const modalTitle = await page.textContent('#modal-title');
      assert.equal(modalTitle.trim(), 'Archero', 'Modal shows Archero title');

      assert.equal(await modal.evaluate(el => el.matches('dialog:modal')), true, 'Native modal makes background inert');
      for (const key of ['Shift+Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Tab']) {
        await page.keyboard.press(key);
        assert.equal(await page.evaluate(() => document.activeElement === document.body || document.querySelector('dialog').contains(document.activeElement)), true, 'Tab cannot reach inert background (browser chrome may receive focus)');
      }

      // Test Escape key closes modal & restores focus
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 });

      const isFocused = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.tagName === 'BUTTON' && active.textContent.includes('Details');
      });
      assert.ok(isFocused, 'Focus returned to Details button on Escape');

      // Test Details on unplayable game (Nekoverse)
      const nekoCard = await page.$('.game-card:nth-child(3)');
      await nekoCard.hover();
      const nekoDetailsBtn = await page.$('.game-card:nth-child(3) button.btn-outline');
      await nekoDetailsBtn.click();
      await page.waitForSelector('[role="dialog"]');
      const nekoModalTitle = await page.textContent('#modal-title');
      assert.equal(nekoModalTitle.trim(), 'Nekoverse');
      const demoUnavailable = await page.$('.modal-footer .btn-unavailable');
      assert.ok(demoUnavailable, 'Modal for Nekoverse shows Demo Unavailable');

      // Close modal using close button
      const closeBtn = await page.$('button.modal-close');
      await closeBtn.click();
      await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 3000 });

      // Check Team: exactly 3 team cards
      const teamCards = await page.$$('.team-card');
      assert.equal(teamCards.length, 3, 'Exactly 3 team members rendered');

      const teamNames = await page.$$eval('.team-name', (els) => els.map((e) => e.textContent.trim()));
      assert.deepEqual(teamNames, ['Hoa T.V', 'Hollow', 'Khiem L.A'], 'Team names match original');

      // Check stats: 5+, 6, 3
      const statNumbers = await page.$$eval('.stat-number', (els) => els.map((e) => e.textContent.trim()));
      assert.deepEqual(statNumbers, ['5+', '6', '3'], 'Studio stats match original');

      // Check No Horizontal Overflow on Desktop
      const overflowDesktop = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert.equal(overflowDesktop, false, 'No horizontal overflow on desktop 1280px');

      // Check Contact Form: Blank / Invalid validation
      const submitBtn = await page.$('#contact-form button[type="submit"]');
      await submitBtn.click();

      // Error message rendered, no mailto link prepared
      const errorText = await page.textContent('.contact-error');
      assert.match(errorText, /Please provide your name/, 'Blank name triggers validation error');
      assert.equal(await page.$('.contact-notice'), null, 'No mailto generated on invalid submit');

      // Check Contact Form: Fill adversarial & unicode text
      await page.fill('#name', '<script>alert("XSS")</script> & "Tester"');
      await page.fill('#email', 'tester.user+check@example.com');
      await page.fill('#subject', 'Question with CRLF \r\n and emoji 🎮🚀');
      await page.fill('#message', 'First line\r\nSecond line with "quotes" & emojis 🐱‍👤');

      await submitBtn.click();

      // Wait for status notice
      const statusNotice = await page.waitForSelector('.contact-notice[role="status"]', { timeout: 3000 });
      assert.ok(statusNotice, 'Contact notice rendered');
      const noticeText = await statusNotice.textContent();
      assert.match(noticeText, /madonestudio69@gmail\.com/, 'Notice contains target email');
      assert.match(noticeText, /No message was automatically sent/, 'Notice clarifies not auto-sent');

      const mailtoHref = await page.$eval('.contact-notice a', (el) => el.getAttribute('href'));
      assert.ok(mailtoHref.startsWith('mailto:madonestudio69@gmail.com'), 'mailto link is correctly formatted');
      assert.ok(mailtoHref.includes('%20') || mailtoHref.includes('%0A'), 'mailto params are URL-encoded');
      assert.ok(!mailtoHref.includes('<script>'), 'XSS script tag not raw in mailto');
      await page.fill('#message', 'a'.repeat(1999) + '🎮');
      await submitBtn.click();
      const boundedMail = await page.locator('.contact-notice a').getAttribute('href');
      assert.equal(new URL(boundedMail).searchParams.get('body').includes('a'.repeat(1999)), true, 'Unicode at the length boundary still produces a fresh draft');
      await page.fill('#message', '');
      await submitBtn.click();
      assert.equal(await page.locator('.contact-notice').count(), 0, 'Invalid edits cannot leave an old draft ready to send');

      await context.close();
    }

    for (const viewport of [{width:320,height:740},{width:390,height:844},{width:844,height:390}]) {
      const page = await browser.newPage({viewport});
      await page.goto(baseUrl, {waitUntil:'networkidle'});
      for (const selector of ['.contact-form-container','#contact-form','input','textarea','.hero-buttons .btn']) {
        const boxes = await page.locator(selector).evaluateAll(els => els.map(el => {const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}));
        for (const box of boxes) assert.ok(box.left >= 0 && box.right <= viewport.width + 1 && box.width > 0, `${selector} fits ${viewport.width}px`);
      }
      assert.equal(await page.locator('#email').evaluate(el => parseFloat(getComputedStyle(el).fontSize)>=16), true, 'Inputs avoid iOS focus zoom');
      await page.close();
    }

    // --- 2. MOBILE VIEWPORT (390x844) ---
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();

      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#root > *', { timeout: 5000 });

      // Nav Toggle Button accessible attributes
      const navToggle = await page.$('button#nav-toggle');
      assert.ok(navToggle, 'Mobile nav toggle button exists');

      const initialExpanded = await navToggle.getAttribute('aria-expanded');
      assert.equal(initialExpanded, 'false', 'aria-expanded is initially false');

      const navMenu = await page.$('#nav-menu');
      const initialActive = await navMenu.evaluate((el) => el.classList.contains('active'));
      assert.equal(initialActive, false, 'Nav menu is initially not active');

      // Click to open menu
      await navToggle.click();
      const openExpanded = await navToggle.getAttribute('aria-expanded');
      assert.equal(openExpanded, 'true', 'aria-expanded becomes true when open');
      const openActive = await navMenu.evaluate((el) => el.classList.contains('active'));
      assert.equal(openActive, true, 'Nav menu has active class when open');

      // Click a nav link -> closes menu
      const studioLink = await page.$('#nav-menu a[href="#studio"]');
      await studioLink.click();
      const closedExpanded = await navToggle.getAttribute('aria-expanded');
      assert.equal(closedExpanded, 'false', 'aria-expanded returns to false after link click');
      const closedActive = await navMenu.evaluate((el) => el.classList.contains('active'));
      assert.equal(closedActive, false, 'Nav menu loses active class after link click');

      // Mobile cards info & buttons are readable/visible
      const gameInfoDisplay = await page.$eval('.game-card .game-info', (el) => {
        const style = window.getComputedStyle(el);
        return { opacity: style.opacity, pointerEvents: style.pointerEvents };
      });
      assert.equal(gameInfoDisplay.opacity, '1', 'Game info is visible on mobile');
      assert.equal(gameInfoDisplay.pointerEvents, 'auto', 'Game info has pointer-events: auto on mobile');

      // Check No Horizontal Overflow on Mobile 390px
      const overflowMobile = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert.equal(overflowMobile, false, 'No horizontal overflow on mobile 390px');

      await context.close();
    }

    console.log('All Playwright UI tests PASSED successfully.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
