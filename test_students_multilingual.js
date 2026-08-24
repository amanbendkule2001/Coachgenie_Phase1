const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/Admin/.gemini/antigravity-ide/brain/28e12254-dac2-4d28-987b-d6f4fa7e0ee3';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('Logging in...');
  await page.fill('input[type="text"]', 'demo');
  await page.fill('input[type="email"]', 'owner@demo.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('Logged in to dashboard!');

  // 1. Switch to Marathi
  console.log('Switching to Marathi...');
  await page.evaluate(() => {
    localStorage.setItem('coachgenie_lang', 'mr');
  });
  await page.goto('http://localhost:3000/students', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Capturing Marathi Students List...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_mr_list.png'), fullPage: true });

  // Open Edit Modal in Marathi
  const editBtns = page.locator('button[title*="संपादित"], button[title*="Edit"]');
  if (await editBtns.count() > 0) {
    await editBtns.first().click();
    await page.waitForTimeout(800);
    console.log('Capturing Marathi Edit Modal...');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_mr_edit_modal.png') });
    // close modal
    const closeBtn = page.locator('button:has-text("रद्द करा"), button:has-text("Cancel")');
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click();
      await page.waitForTimeout(400);
    }
  }

  // Click on first student profile (Lokesh Sohanda)
  const viewLinks = page.locator('a[title*="पहा"], a[title*="View"]');
  if (await viewLinks.count() > 0) {
    await viewLinks.first().click();
    await page.waitForTimeout(1500);
    console.log('Capturing Marathi Student Detail View...');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_mr_detail.png'), fullPage: true });

    // Open Batch Enrollment dialog
    const enrollBtn = page.locator('button:has-text("बॅचमध्ये दाखल करा"), button:has-text("Enroll in Batch")');
    if (await enrollBtn.count() > 0) {
      await enrollBtn.first().click();
      await page.waitForTimeout(800);
      console.log('Capturing Marathi Manage Batches Dialog...');
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_mr_enroll_dialog.png') });
      // close dialog
      const doneBtn = page.locator('button:has-text("पूर्ण"), button:has-text("Done")');
      if (await doneBtn.count() > 0) {
        await doneBtn.first().click();
        await page.waitForTimeout(400);
      }
    }
  }

  // 2. Switch to Hindi
  console.log('Switching to Hindi...');
  await page.evaluate(() => {
    localStorage.setItem('coachgenie_lang', 'hi');
  });
  await page.goto('http://localhost:3000/students', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('Capturing Hindi Students List...');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_hi_list.png'), fullPage: true });

  // Open Edit Modal in Hindi
  const editBtnsHi = page.locator('button[title*="संपादित"], button[title*="Edit"]');
  if (await editBtnsHi.count() > 0) {
    await editBtnsHi.first().click();
    await page.waitForTimeout(800);
    console.log('Capturing Hindi Edit Modal...');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_hi_edit_modal.png') });
    // close modal
    const closeBtnHi = page.locator('button:has-text("रद्द करें"), button:has-text("Cancel")');
    if (await closeBtnHi.count() > 0) {
      await closeBtnHi.first().click();
      await page.waitForTimeout(400);
    }
  }

  // Click on first student profile
  const viewLinksHi = page.locator('a[title*="देखें"], a[title*="View"]');
  if (await viewLinksHi.count() > 0) {
    await viewLinksHi.first().click();
    await page.waitForTimeout(1500);
    console.log('Capturing Hindi Student Detail View...');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_hi_detail.png'), fullPage: true });

    // Open Batch Enrollment dialog
    const enrollBtnHi = page.locator('button:has-text("बैच में नामांकित करें"), button:has-text("Enroll in Batch")');
    if (await enrollBtnHi.count() > 0) {
      await enrollBtnHi.first().click();
      await page.waitForTimeout(800);
      console.log('Capturing Hindi Manage Batches Dialog...');
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'students_hi_enroll_dialog.png') });
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
})();
