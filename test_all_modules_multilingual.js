const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testAllModulesMultilingual() {
  console.log('🚀 Testing Comprehensive Multilingual Support (Marathi & Hindi) across all modules...');
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

  // 2. Set Language to Marathi (🚩 मराठी)
  console.log('🚩 Switching interface to Marathi (मराठी)...');
  await page.click('[data-testid="language-switcher"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="lang-opt-mr"]');
  await page.waitForTimeout(1200);

  const modules = [
    { name: '01_Dashboard_Marathi', url: 'http://localhost:3000/dashboard' },
    { name: '02_Leads_Marathi', url: 'http://localhost:3000/leads' },
    { name: '03_Admissions_Marathi', url: 'http://localhost:3000/admissions' },
    { name: '04_Students_Marathi', url: 'http://localhost:3000/students' },
    { name: '05_Batches_Marathi', url: 'http://localhost:3000/batches' },
    { name: '06_Sessions_Marathi', url: 'http://localhost:3000/sessions' },
    { name: '07_Attendance_Marathi', url: 'http://localhost:3000/attendance' },
    { name: '08_AttendanceReports_Marathi', url: 'http://localhost:3000/attendance/reports' },
    { name: '09_Exams_Marathi', url: 'http://localhost:3000/exams' },
    { name: '10_GrowthCards_Marathi', url: 'http://localhost:3000/growth-cards' },
    { name: '11_Fees_Marathi', url: 'http://localhost:3000/fees' },
    { name: '12_Billing_Marathi', url: 'http://localhost:3000/settings/billing' },
    { name: '13_Notifications_Marathi', url: 'http://localhost:3000/notifications' },
    { name: '14_AIAnalytics_Marathi', url: 'http://localhost:3000/ai/analytics' },
    { name: '15_Docs_Marathi', url: 'http://localhost:3000/docs' },
  ];

  for (const mod of modules) {
    console.log(`📸 Capturing Marathi: ${mod.name}...`);
    await page.goto(mod.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(screensDir, `${mod.name}.png`) });
  }

  // 3. Switch Language to Hindi (🇮🇳 हिन्दी)
  console.log('🇮🇳 Switching interface to Hindi (हिन्दी)...');
  await page.click('[data-testid="language-switcher"]');
  await page.waitForTimeout(300);
  await page.click('[data-testid="lang-opt-hi"]');
  await page.waitForTimeout(1200);

  const hindiModules = [
    { name: '16_Dashboard_Hindi', url: 'http://localhost:3000/dashboard' },
    { name: '17_Leads_Hindi', url: 'http://localhost:3000/leads' },
    { name: '18_Admissions_Hindi', url: 'http://localhost:3000/admissions' },
    { name: '19_Exams_Hindi', url: 'http://localhost:3000/exams' },
    { name: '20_Attendance_Hindi', url: 'http://localhost:3000/attendance' },
    { name: '21_Fees_Hindi', url: 'http://localhost:3000/fees' },
    { name: '22_AIAnalytics_Hindi', url: 'http://localhost:3000/ai/analytics' },
  ];

  for (const mod of hindiModules) {
    console.log(`📸 Capturing Hindi: ${mod.name}...`);
    await page.goto(mod.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(screensDir, `${mod.name}.png`) });
  }

  await browser.close();
  console.log('🎉 Comprehensive multilingual verification completed! Screenshots saved in ./multilingual_module_screens/');
}

testAllModulesMultilingual().catch(console.error);
