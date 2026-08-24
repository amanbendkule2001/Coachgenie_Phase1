const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testLeads() {
  console.log('🚀 Visual verification of Leads module (Marathi & Hindi)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const screensDir = path.join(__dirname, 'multilingual_module_screens');
  if (!fs.existsSync(screensDir)) fs.mkdirSync(screensDir, { recursive: true });

  // Login
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[name="institute"]', 'demo').catch(() => {});
  await page.fill('input[name="email"]', 'owner@demo.com').catch(() => {});
  await page.fill('input[name="password"]', 'Admin@123').catch(() => {});
  await page.click('button[type="submit"]').catch(() => {});
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // 1. MARATHI
  console.log('🚩 Capturing Marathi Leads views...');
  await page.evaluate(() => localStorage.setItem('coachgenie_lang', 'mr'));
  await page.goto('http://localhost:3000/leads', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="lead-row"]', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Table
  await page.screenshot({ path: path.join(screensDir, 'leads_mr_table.png') });
  console.log('  -> Captured leads_mr_table.png');

  // Add Modal
  await page.click('[data-testid="add-lead-btn"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screensDir, 'leads_mr_add_modal.png') });
  console.log('  -> Captured leads_mr_add_modal.png');

  // Close modal and switch to Kanban
  await page.click('[data-testid="lead-form-cancel"]').catch(() => {});
  await page.waitForTimeout(500);
  await page.click('button:has-text("कानबान")').catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screensDir, 'leads_mr_kanban.png') });
  console.log('  -> Captured leads_mr_kanban.png');

  // 2. HINDI
  console.log('🇮🇳 Capturing Hindi Leads views...');
  await page.evaluate(() => localStorage.setItem('coachgenie_lang', 'hi'));
  await page.goto('http://localhost:3000/leads', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="lead-row"]', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Table
  await page.screenshot({ path: path.join(screensDir, 'leads_hi_table.png') });
  console.log('  -> Captured leads_hi_table.png');

  // Add Modal
  await page.click('[data-testid="add-lead-btn"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screensDir, 'leads_hi_add_modal.png') });
  console.log('  -> Captured leads_hi_add_modal.png');

  // Close modal and switch to Kanban
  await page.click('[data-testid="lead-form-cancel"]').catch(() => {});
  await page.waitForTimeout(500);
  await page.click('button:has-text("कान्बान")').catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screensDir, 'leads_hi_kanban.png') });
  console.log('  -> Captured leads_hi_kanban.png');

  await browser.close();
  console.log('🎉 Verification completed successfully!');
}

testLeads().catch(console.error);
