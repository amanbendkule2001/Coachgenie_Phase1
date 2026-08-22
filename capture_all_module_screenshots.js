const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureAll() {
  const dir = path.join(__dirname, 'manual_screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Launching browser to capture all module screens...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const routes = [
    { name: 'screenshot_login.png', url: 'http://localhost:3000/login' },
    { name: 'screenshot_dashboard.png', url: 'http://localhost:3000/dashboard' },
    { name: 'screenshot_leads.png', url: 'http://localhost:3000/leads' },
    { name: 'screenshot_admissions.png', url: 'http://localhost:3000/admissions' },
    { name: 'screenshot_students.png', url: 'http://localhost:3000/students' },
    { name: 'screenshot_batches.png', url: 'http://localhost:3000/batches' },
    { name: 'screenshot_attendance.png', url: 'http://localhost:3000/attendance' },
    { name: 'screenshot_exams.png', url: 'http://localhost:3000/exams' },
    { name: 'screenshot_growth_cards.png', url: 'http://localhost:3000/growth-cards' },
    { name: 'screenshot_fees.png', url: 'http://localhost:3000/fees' },
    { name: 'screenshot_notifications.png', url: 'http://localhost:3000/notifications' },
    { name: 'screenshot_ai.png', url: 'http://localhost:3000/ai' },
    { name: 'screenshot_settings.png', url: 'http://localhost:3000/settings/users' }
  ];

  // Perform Login
  try {
    console.log('Logging in...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(dir, 'screenshot_login.png') });

    await page.fill('input[name="institute"]', 'demo').catch(() => {});
    await page.fill('input[name="email"]', 'owner@demo.com').catch(() => {});
    await page.fill('input[name="password"]', 'Admin@1234').catch(() => {});
    await page.click('button[type="submit"]').catch(() => {});
    await page.waitForTimeout(2500);
  } catch (e) {
    console.log('Login attempt error:', e.message);
  }

  for (const r of routes) {
    if (r.name === 'screenshot_login.png') continue;
    try {
      console.log(`Capturing ${r.name} from ${r.url}...`);
      await page.goto(r.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(dir, r.name) });
    } catch (e) {
      console.log(`Failed to capture ${r.url}:`, e.message);
    }
  }

  await browser.close();
  console.log('Screenshots capture finished.');
}

captureAll().catch(console.error);
