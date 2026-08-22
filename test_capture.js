const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testCapture() {
  const dir = path.join(__dirname, 'fresh_screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Launching browser for fresh screenshot capture...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(dir, 'screenshot_login.png') });

  console.log('Filling form...');
  await page.fill('input[placeholder="visionacademy"]', 'demo');
  await page.fill('input[placeholder="admin@example.com"]', 'owner@demo.com');
  await page.fill('input[placeholder="••••••••"]', 'Admin@1234');
  
  console.log('Submitting login...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]')
  ]).catch(err => console.log('Navigation note:', err.message));

  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());
  await page.screenshot({ path: path.join(dir, 'screenshot_dashboard.png') });

  const routes = [
    { name: 'screenshot_leads.png', url: 'http://localhost:3000/leads' },
    { name: 'screenshot_admissions.png', url: 'http://localhost:3000/admissions' },
    { name: 'screenshot_students.png', url: 'http://localhost:3000/students' },
    { name: 'screenshot_batches.png', url: 'http://localhost:3000/batches' },
    { name: 'screenshot_sessions.png', url: 'http://localhost:3000/sessions' },
    { name: 'screenshot_attendance.png', url: 'http://localhost:3000/attendance' },
    { name: 'screenshot_exams.png', url: 'http://localhost:3000/exams' },
    { name: 'screenshot_growth_cards.png', url: 'http://localhost:3000/growth-cards' },
    { name: 'screenshot_fees.png', url: 'http://localhost:3000/fees' },
    { name: 'screenshot_billing.png', url: 'http://localhost:3000/billing' },
    { name: 'screenshot_notifications.png', url: 'http://localhost:3000/notifications' },
    { name: 'screenshot_ai.png', url: 'http://localhost:3000/ai' },
    { name: 'screenshot_settings.png', url: 'http://localhost:3000/settings/users' }
  ];

  for (const r of routes) {
    try {
      console.log(`Navigating to ${r.url}...`);
      await page.goto(r.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(dir, r.name) });
      console.log(`Captured ${r.name} (${fs.statSync(path.join(dir, r.name)).size} bytes)`);
    } catch (e) {
      console.log(`Error on ${r.url}:`, e.message);
    }
  }

  await browser.close();
  console.log('Done test capture!');
}

testCapture().catch(console.error);
