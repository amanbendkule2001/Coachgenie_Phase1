const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testDashboardMultilingual() {
  console.log('🚀 Testing Dashboard Module (Marathi & Hindi) Authorized Section and KPIs...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const screensDir = path.join(__dirname, 'multilingual_module_screens');
  if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true });

  // 1. Authentication
  console.log('🔑 Logging in to CoachGenie...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[name="institute"]', 'demo').catch(() => {});
  await page.fill('input[name="email"]', 'owner@demo.com').catch(() => {});
  await page.fill('input[name="password"]', 'Admin@123').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Helper to scroll to bottom
  const scrollToBottom = async () => {
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = main.scrollHeight;
    });
    await page.waitForTimeout(500);
  };

  const scrollToTop = async () => {
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 0;
    });
    await page.waitForTimeout(500);
  };

  // 2. Capture English Dashboard (Top + Bottom)
  console.log('🇬🇧 Capturing English Dashboard...');
  await scrollToTop();
  await page.screenshot({ path: path.join(screensDir, 'dashboard_en_top.png') });
  await scrollToBottom();
  await page.screenshot({ path: path.join(screensDir, 'dashboard_en_bottom_authorized.png') });

  // 3. Switch to Marathi (🚩 मराठी)
  console.log('🚩 Switching interface to Marathi (मराठी)...');
  await scrollToTop();
  await page.click('[data-testid="language-switcher"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="lang-opt-mr"]');
  await page.waitForTimeout(1500);

  console.log('📸 Capturing Marathi Dashboard (Top & Bottom Authorized Section)...');
  await scrollToTop();
  await page.screenshot({ path: path.join(screensDir, 'dashboard_mr_top.png') });
  await scrollToBottom();
  await page.screenshot({ path: path.join(screensDir, 'dashboard_mr_bottom_authorized.png') });

  // 4. Switch to Hindi (🇮🇳 हिन्दी)
  console.log('🇮🇳 Switching interface to Hindi (हिन्दी)...');
  await scrollToTop();
  await page.click('[data-testid="language-switcher"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="lang-opt-hi"]');
  await page.waitForTimeout(1500);

  console.log('📸 Capturing Hindi Dashboard (Top & Bottom Authorized Section)...');
  await scrollToTop();
  await page.screenshot({ path: path.join(screensDir, 'dashboard_hi_top.png') });
  await scrollToBottom();
  await page.screenshot({ path: path.join(screensDir, 'dashboard_hi_bottom_authorized.png') });

  await browser.close();
  console.log('🎉 Dashboard module multilingual verification completed!');
}

testDashboardMultilingual().catch(console.error);
