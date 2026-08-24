const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Helper for smooth scrolling
async function smoothScroll(page, distance, steps = 12, delay = 45) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(delay);
  }
}

// Inject presenter HUD and visual cursor
async function injectHUD(page, sectionTitle = '') {
  await page.evaluate((title) => {
    let cursor = document.getElementById('recording-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'recording-cursor';
      cursor.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 22px;
        height: 22px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.4) 70%, transparent 100%);
        border: 2px solid #ffffff;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999999;
        transform: translate(-50%, -50%);
        transition: width 0.15s, height 0.15s, background-color 0.15s;
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.8);
      `;
      document.body.appendChild(cursor);

      window.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      });

      window.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
        cursor.style.background = 'radial-gradient(circle, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.4) 70%, transparent 100%)';
      });

      window.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.background = 'radial-gradient(circle, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.4) 70%, transparent 100%)';
      });
    }

    let hud = document.getElementById('recording-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'recording-hud';
      hud.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 28px;
        padding: 12px 22px;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.94) 100%);
        color: #f8fafc;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15);
        z-index: 9999998;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 10px;
        backdrop-filter: blur(12px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      `;
      document.body.appendChild(hud);
    }
    if (title) {
      hud.innerHTML = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;"></span> ${title}`;
      hud.style.opacity = '1';
      hud.style.transform = 'translateY(0)';
    } else {
      hud.style.opacity = '0';
      hud.style.transform = 'translateY(10px)';
    }
  }, sectionTitle);
}

// Smooth move and click helper
async function smoothMoveAndClick(page, selectorOrLocator) {
  try {
    let loc = typeof selectorOrLocator === 'string' ? page.locator(selectorOrLocator).first() : selectorOrLocator;
    if (await loc.isVisible({ timeout: 2000 })) {
      const box = await loc.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
        await page.waitForTimeout(150);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up();
        return true;
      }
    }
  } catch (e) {
    try {
      if (typeof selectorOrLocator === 'string') {
        await page.click(selectorOrLocator, { timeout: 1000 });
      } else {
        await selectorOrLocator.click({ timeout: 1000 });
      }
      return true;
    } catch (err) {}
  }
  return false;
}

async function recordTimedVideo() {
  const timingsFile = path.join(__dirname, 'scene_timings.json');
  if (!fs.existsSync(timingsFile)) {
    throw new Error('scene_timings.json not found! Run generate_video_with_audio.py first.');
  }

  const scenes = JSON.parse(fs.readFileSync(timingsFile, 'utf-8'));
  const outputDir = path.join(__dirname, 'timed_video_output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('🎬 Starting Timed Video Recording with Audio Synchronization...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1440, height: 900 }
    }
  });

  const page = await context.newPage();

  for (const scene of scenes) {
    console.log(`📍 Scene: ${scene.title} (Allocated: ${scene.duration.toFixed(1)}s)`);
    const startTime = Date.now();
    const targetMs = scene.duration * 1000;

    await page.goto(scene.url, { waitUntil: 'networkidle' }).catch(() => {});
    await injectHUD(page, scene.title);

    if (scene.id === 'scene_01_login') {
      // Login interaction
      await page.waitForTimeout(800);
      const instInput = page.locator('input[name="institute"]');
      if (await instInput.isVisible()) {
        await smoothMoveAndClick(page, instInput);
        await instInput.fill('');
        await instInput.pressSequentially('demo', { delay: 100 });
      }

      const emailInput = page.locator('input[name="email"]');
      if (await emailInput.isVisible()) {
        await smoothMoveAndClick(page, emailInput);
        await emailInput.fill('');
        await emailInput.pressSequentially('owner@demo.com', { delay: 70 });
      }

      const pwInput = page.locator('input[name="password"]');
      if (await pwInput.isVisible()) {
        await smoothMoveAndClick(page, pwInput);
        await pwInput.fill('');
        await pwInput.pressSequentially('Admin@123', { delay: 80 });
      }

      const submitBtn = page.locator('button[type="submit"]');
      await smoothMoveAndClick(page, submitBtn);
    } else {
      // General scene interaction & smooth presentation
      await page.mouse.move(400, 250, { steps: 12 });
      await page.waitForTimeout(600);
      await page.mouse.move(700, 250, { steps: 12 });
      await page.waitForTimeout(600);

      // Smooth scroll down and up
      await smoothScroll(page, 380, 10, 50);
      await page.waitForTimeout(1000);
      await smoothScroll(page, -380, 10, 40);
    }

    // Ensure the scene matches the exact audio duration
    const elapsed = Date.now() - startTime;
    const remaining = targetMs - elapsed;
    if (remaining > 0) {
      await page.waitForTimeout(remaining);
    }
  }

  console.log('💾 Closing browser context to flush video file...');
  await page.close();
  await context.close();
  await browser.close();

  // Find newest raw video
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const latest = files.map(f => ({
      name: f,
      time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
    })).sort((a, b) => b.time - a.time)[0].name;

    const rawDst = path.join(__dirname, 'CoachGenie_Application_Walkthrough_Raw.webm');
    fs.copyFileSync(path.join(outputDir, latest), rawDst);
    console.log(`✅ Timed raw video saved to: ${rawDst}`);
  }
}

recordTimedVideo().catch(console.error);
