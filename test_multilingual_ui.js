const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testMultilingualUI() {
  console.log('🧪 Testing Multilingual Language Switcher on Live Application...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="institute"]', 'demo').catch(() => {});
  await page.fill('input[name="email"]', 'owner@demo.com').catch(() => {});
  await page.fill('input[name="password"]', 'Admin@123').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const screensDir = path.join(__dirname, 'multilingual_screenshots');
  if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true });

  // 1. English Dashboard
  console.log('📸 Capturing English Dashboard...');
  await page.screenshot({ path: path.join(screensDir, 'dashboard_english.png') });

  // 2. Switch to Hindi (हिंदी)
  console.log('🔄 Switching to Hindi (हिन्दी)...');
  await page.click('[data-testid="language-switcher"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="lang-opt-hi"]');
  await page.waitForTimeout(1500);
  console.log('📸 Capturing Hindi Dashboard...');
  await page.screenshot({ path: path.join(screensDir, 'dashboard_hindi.png') });

  // Check Hindi Leads page
  console.log('📍 Visiting Leads in Hindi...');
  await page.goto('http://localhost:3000/leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('📸 Capturing Hindi Leads...');
  await page.screenshot({ path: path.join(screensDir, 'leads_hindi.png') });

  // 3. Switch to Marathi (मराठी)
  console.log('🔄 Switching to Marathi (मराठी)...');
  await page.click('[data-testid="language-switcher"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="lang-opt-mr"]');
  await page.waitForTimeout(1500);
  console.log('📸 Capturing Marathi Leads...');
  await page.screenshot({ path: path.join(screensDir, 'leads_marathi.png') });

  // Check Marathi Dashboard
  console.log('📍 Visiting Dashboard in Marathi...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('📸 Capturing Marathi Dashboard...');
  await page.screenshot({ path: path.join(screensDir, 'dashboard_marathi.png') });

  await browser.close();
  console.log('🎉 Multilingual UI test successfully completed! Screenshots saved in ./multilingual_screenshots/');
}

testMultilingualUI().catch(console.error);
