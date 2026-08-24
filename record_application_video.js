const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Helper for smooth scrolling
async function smoothScroll(page, distance, steps = 12, delay = 50) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, distance / steps);
    await page.waitForTimeout(delay);
  }
}

// Helper to inject a visual cursor and floating HUD badge for professional presentation video
async function injectHUD(page, sectionTitle = '') {
  await page.evaluate((title) => {
    // 1. Cursor
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

    // 2. HUD Badge
    let hud = document.getElementById('recording-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'recording-hud';
      hud.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 28px;
        padding: 10px 20px;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.92) 100%);
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

// Helper to move mouse smoothly to element and click
async function smoothMoveAndClick(page, selectorOrLocator) {
  try {
    let loc = typeof selectorOrLocator === 'string' ? page.locator(selectorOrLocator).first() : selectorOrLocator;
    if (await loc.isVisible({ timeout: 2500 })) {
      const box = await loc.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
        await page.waitForTimeout(200);
        await page.mouse.down();
        await page.waitForTimeout(120);
        await page.mouse.up();
        return true;
      }
    }
  } catch (e) {
    try {
      if (typeof selectorOrLocator === 'string') {
        await page.click(selectorOrLocator, { timeout: 1500 });
      } else {
        await selectorOrLocator.click({ timeout: 1500 });
      }
      return true;
    } catch (err) {}
  }
  return false;
}

async function recordApplicationTour() {
  const outputDir = path.join(__dirname, 'recorded_videos');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('🎬 Starting CoachGenie Application Flow Video Recording (Admin@123)...');

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

  try {
    // -------------------------------------------------------------
    // SCENE 1: AUTHENTICATION & LOGIN FLOW
    // -------------------------------------------------------------
    console.log('📍 [1/10] Recording Authentication Flow (Institute: demo, Password: Admin@123)...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await injectHUD(page, '🔐 Step 1: Secure Institute Authentication');
    await page.waitForTimeout(1500);

    // Typing Institute code: demo
    const instInput = page.locator('input[name="institute"]');
    if (await instInput.isVisible()) {
      await smoothMoveAndClick(page, instInput);
      await instInput.fill('');
      await instInput.pressSequentially('demo', { delay: 110 });
      await page.waitForTimeout(400);
    }

    // Typing Email: owner@demo.com
    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      await smoothMoveAndClick(page, emailInput);
      await emailInput.fill('');
      await emailInput.pressSequentially('owner@demo.com', { delay: 80 });
      await page.waitForTimeout(400);
    }

    // Typing Password: Admin@123
    const pwInput = page.locator('input[name="password"]');
    if (await pwInput.isVisible()) {
      await smoothMoveAndClick(page, pwInput);
      await pwInput.fill('');
      await pwInput.pressSequentially('Admin@123', { delay: 90 });
      await page.waitForTimeout(600);
    }

    // Click Sign In Button
    console.log('🔐 Submitting login credentials with Admin@123...');
    const submitBtn = page.locator('button[type="submit"]');
    await smoothMoveAndClick(page, submitBtn);
    
    // Wait for Dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // -------------------------------------------------------------
    // SCENE 2: EXECUTIVE DASHBOARD & ANALYTICS
    // -------------------------------------------------------------
    console.log('📍 [2/10] Recording Executive Dashboard & Live Analytics...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await injectHUD(page, '📊 Step 2: Executive Dashboard & Live Metrics');
    await page.waitForTimeout(2000);

    // Hover over KPI Metric Cards
    await page.mouse.move(320, 240, { steps: 15 });
    await page.waitForTimeout(700);
    await page.mouse.move(620, 240, { steps: 15 });
    await page.waitForTimeout(700);
    await page.mouse.move(920, 240, { steps: 15 });
    await page.waitForTimeout(700);

    // Scroll through interactive charts and analytics
    await smoothScroll(page, 450, 12, 60);
    await page.waitForTimeout(1800);
    await smoothScroll(page, 400, 10, 60);
    await page.waitForTimeout(1800);

    // Scroll back to top
    await smoothScroll(page, -850, 15, 40);
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // SCENE 3: LEADS MANAGEMENT & CRM PIPELINE
    // -------------------------------------------------------------
    console.log('📍 [3/10] Recording Leads Pipeline & CRM Workflow...');
    await page.goto('http://localhost:3000/leads', { waitUntil: 'networkidle' });
    await injectHUD(page, '🎯 Step 3: Leads & Student Inquiry Pipeline');
    await page.waitForTimeout(2000);

    await page.mouse.move(420, 200, { steps: 12 });
    await page.waitForTimeout(800);

    // Scroll through lead inquiries
    await smoothScroll(page, 380, 10, 50);
    await page.waitForTimeout(1400);
    await smoothScroll(page, -380, 10, 40);
    await page.waitForTimeout(900);

    // -------------------------------------------------------------
    // SCENE 4: ADMISSIONS & STUDENT ENROLMENT
    // -------------------------------------------------------------
    console.log('📍 [4/10] Recording Admissions & Student Enrolment...');
    await page.goto('http://localhost:3000/admissions', { waitUntil: 'networkidle' });
    await injectHUD(page, '📝 Step 4: Enrolments & Admission Processing');
    await page.waitForTimeout(2000);

    await page.mouse.move(520, 260, { steps: 15 });
    await page.waitForTimeout(700);
    await smoothScroll(page, 400, 10, 50);
    await page.waitForTimeout(1400);
    await smoothScroll(page, -400, 10, 40);
    await page.waitForTimeout(900);

    // -------------------------------------------------------------
    // SCENE 5: STUDENT DIRECTORY & PROFILES
    // -------------------------------------------------------------
    console.log('📍 [5/10] Recording Student Directory & Growth Profiles...');
    await page.goto('http://localhost:3000/students', { waitUntil: 'networkidle' });
    await injectHUD(page, '🎓 Step 5: Student Directory & Comprehensive Profiles');
    await page.waitForTimeout(2000);

    await page.mouse.move(460, 280, { steps: 15 });
    await page.waitForTimeout(800);
    await smoothScroll(page, 420, 10, 50);
    await page.waitForTimeout(1400);
    await smoothScroll(page, -420, 10, 40);
    await page.waitForTimeout(900);

    // -------------------------------------------------------------
    // SCENE 6: BATCHES, TIMETABLES & SESSIONS
    // -------------------------------------------------------------
    console.log('📍 [6/10] Recording Batches & Academic Scheduling...');
    await page.goto('http://localhost:3000/batches', { waitUntil: 'networkidle' });
    await injectHUD(page, '📅 Step 6: Batches, Timetables & Class Scheduling');
    await page.waitForTimeout(2000);

    await page.mouse.move(400, 260, { steps: 15 });
    await page.waitForTimeout(700);
    await smoothScroll(page, 380, 10, 50);
    await page.waitForTimeout(1400);
    await smoothScroll(page, -380, 10, 40);
    await page.waitForTimeout(900);

    // -------------------------------------------------------------
    // SCENE 7: ATTENDANCE TRACKING & OPERATIONS
    // -------------------------------------------------------------
    console.log('📍 [7/10] Recording Attendance Tracking System...');
    await page.goto('http://localhost:3000/attendance', { waitUntil: 'networkidle' });
    await injectHUD(page, '📋 Step 7: Real-Time Attendance Management');
    await page.waitForTimeout(2000);

    await page.mouse.move(420, 250, { steps: 15 });
    await page.waitForTimeout(800);
    await smoothScroll(page, 400, 10, 50);
    await page.waitForTimeout(1400);
    await smoothScroll(page, -400, 10, 40);
    await page.waitForTimeout(900);

    // -------------------------------------------------------------
    // SCENE 8: EXAMS & AI GROWTH CARDS
    // -------------------------------------------------------------
    console.log('📍 [8/10] Recording Exams, Assessments & AI Growth Cards...');
    await page.goto('http://localhost:3000/exams', { waitUntil: 'networkidle' });
    await injectHUD(page, '🏆 Step 8: Exams, Assessments & Grading');
    await page.waitForTimeout(2000);

    await page.mouse.move(520, 260, { steps: 15 });
    await page.waitForTimeout(800);
    await smoothScroll(page, 380, 10, 50);
    await page.waitForTimeout(1200);

    // AI Growth Cards
    await page.goto('http://localhost:3000/growth-cards', { waitUntil: 'networkidle' });
    await injectHUD(page, '📈 Step 8b: AI Growth Cards & Performance Intelligence');
    await page.waitForTimeout(2000);
    await smoothScroll(page, 400, 10, 50);
    await page.waitForTimeout(1400);
    await smoothScroll(page, -400, 10, 40);
    await page.waitForTimeout(900);

    // -------------------------------------------------------------
    // SCENE 9: FEES, INVOICES & FINANCIAL REVENUE
    // -------------------------------------------------------------
    console.log('📍 [9/10] Recording Fees & Billing Management...');
    await page.goto('http://localhost:3000/fees', { waitUntil: 'networkidle' });
    await injectHUD(page, '💳 Step 9: Fee Collections, Invoicing & Financial Records');
    await page.waitForTimeout(2000);

    await page.mouse.move(620, 250, { steps: 15 });
    await page.waitForTimeout(800);
    await smoothScroll(page, 450, 10, 50);
    await page.waitForTimeout(1600);
    await smoothScroll(page, -450, 10, 40);
    await page.waitForTimeout(900);

    // -------------------------------------------------------------
    // SCENE 10: AI ANALYTICS & SETTINGS
    // -------------------------------------------------------------
    console.log('📍 [10/10] Recording AI Analytics & Settings...');
    await page.goto('http://localhost:3000/ai/analytics', { waitUntil: 'networkidle' });
    await injectHUD(page, '🤖 Step 10: AI Intelligence & Predictive Analytics');
    await page.waitForTimeout(2500);

    await page.mouse.move(450, 320, { steps: 15 });
    await page.waitForTimeout(1200);

    // User Roles & Settings
    await page.goto('http://localhost:3000/settings/users', { waitUntil: 'networkidle' });
    await injectHUD(page, '⚙️ Step 10b: Staff Permissions & System Settings');
    await page.waitForTimeout(2000);
    await smoothScroll(page, 320, 10, 50);
    await page.waitForTimeout(1400);

    // Clean wrap-up at Dashboard
    console.log('🏁 Navigating back to Dashboard for clean wrap-up...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    await injectHUD(page, '✨ CoachGenie ERP: Complete All-in-One Coaching System');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('⚠️ Recording note:', error.message);
  } finally {
    console.log('💾 Finalizing video file...');
    await page.close();
    await context.close();
    await browser.close();

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
    if (files.length > 0) {
      const latestVideo = files.map(f => ({
        name: f,
        time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
      })).sort((a, b) => b.time - a.time)[0].name;

      const finalVideoPath = path.join(__dirname, 'CoachGenie_Application_Walkthrough.webm');
      fs.copyFileSync(path.join(outputDir, latestVideo), finalVideoPath);
      console.log(`\n🎉 SUCCESS! Walkthrough video updated with Admin@123:\n👉 ${finalVideoPath}`);
    }
  }
}

recordApplicationTour().catch(console.error);
