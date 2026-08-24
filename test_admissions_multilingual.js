const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAdmissions() {
  console.log('🚀 Visual verification of Admissions module (Marathi & Hindi)...');
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
  console.log('🚩 Capturing Marathi Admissions views...');
  await page.evaluate(() => localStorage.setItem('coachgenie_lang', 'mr'));
  await page.goto('http://localhost:3000/admissions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Admissions list
  await page.screenshot({ path: path.join(screensDir, 'admissions_mr_list.png') });
  console.log('  -> Captured admissions_mr_list.png');

  // Add Admission Modal
  await page.click('[data-testid="add-admission"]').catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screensDir, 'admissions_mr_add_modal.png') });
  console.log('  -> Captured admissions_mr_add_modal.png');

  // Close modal and click first admission card to view detail page
  await page.click('button:has-text("रद्द करा")').catch(() => {
    return page.click('button:has-text("Cancel")').catch(() => {});
  });
  await page.waitForTimeout(500);

  const firstCard = await page.$('[data-testid^="admission-card-"]');
  if (firstCard) {
    await firstCard.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screensDir, 'admissions_mr_detail.png') });
    console.log('  -> Captured admissions_mr_detail.png');
  }

  // 2. HINDI
  console.log('🇮🇳 Capturing Hindi Admissions views...');
  await page.evaluate(() => localStorage.setItem('coachgenie_lang', 'hi'));
  await page.goto('http://localhost:3000/admissions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Admissions list
  await page.screenshot({ path: path.join(screensDir, 'admissions_hi_list.png') });
  console.log('  -> Captured admissions_hi_list.png');

  // Add Admission Modal
  await page.click('[data-testid="add-admission"]').catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screensDir, 'admissions_hi_add_modal.png') });
  console.log('  -> Captured admissions_hi_add_modal.png');

  // Close modal and click first admission card to view detail page
  await page.click('button:has-text("रद्द करें")').catch(() => {
    return page.click('button:has-text("Cancel")').catch(() => {});
  });
  await page.waitForTimeout(500);

  const firstCardHi = await page.$('[data-testid^="admission-card-"]');
  if (firstCardHi) {
    await firstCardHi.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(screensDir, 'admissions_hi_detail.png') });
    console.log('  -> Captured admissions_hi_detail.png');
  }

  await browser.close();
  console.log('🎉 Verification completed successfully!');
}

testAdmissions().catch(console.error);
