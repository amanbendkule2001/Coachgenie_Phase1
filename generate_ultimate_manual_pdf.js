const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function getBase64Image(filePath) {
  if (fs.existsSync(filePath)) {
    return 'data:image/png;base64,' + fs.readFileSync(filePath).toString('base64');
  }
  return '';
}

async function buildUltimateManual() {
  console.log("Building Brand New CoachGenie ERP Enterprise User Manual with 100% Fresh Screenshots...");

  const freshDir = path.join(__dirname, 'fresh_screenshots');
  const adminScreenshotsDir = path.join(__dirname, 'client', 'apps', 'admin', 'manual_screenshots');

  const imgLogin = getBase64Image(path.join(freshDir, 'screenshot_login.png'));
  const imgDashboard = getBase64Image(path.join(freshDir, 'screenshot_dashboard.png'));
  const imgLeads = getBase64Image(path.join(freshDir, 'screenshot_leads.png'));
  const imgAdmissions = getBase64Image(path.join(freshDir, 'screenshot_admissions.png'));
  const imgStudents = getBase64Image(path.join(freshDir, 'screenshot_students.png'));
  const imgBatches = getBase64Image(path.join(freshDir, 'screenshot_batches.png'));
  const imgSessions = getBase64Image(path.join(freshDir, 'screenshot_sessions.png'));
  const imgAttendance = getBase64Image(path.join(freshDir, 'screenshot_attendance.png'));
  const imgExams = getBase64Image(path.join(freshDir, 'screenshot_exams.png'));
  const imgGrowthCards = getBase64Image(path.join(freshDir, 'screenshot_growth_cards.png'));
  const imgFees = getBase64Image(path.join(freshDir, 'screenshot_fees.png'));
  const imgBilling = getBase64Image(path.join(freshDir, 'screenshot_billing.png'));
  const imgNotifications = getBase64Image(path.join(freshDir, 'screenshot_notifications.png'));
  const imgAI = getBase64Image(path.join(adminScreenshotsDir, 'screenshot_ai.png')) || getBase64Image(path.join(freshDir, 'screenshot_ai.png'));
  const imgSettings = getBase64Image(path.join(freshDir, 'screenshot_settings.png'));

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CoachGenie ERP - Complete Enterprise Operational User Manual</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 9.5px;
      line-height: 1.45;
    }

    code, pre {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 9px;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Cover Page */
    .cover-container {
      height: 275mm;
      display: flex;
      flex-direction: row;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      page-break-after: always;
      background: #ffffff;
    }

    .cover-left {
      width: 35%;
      height: 100%;
      background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #4338ca 100%);
      padding: 38px 24px;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cover-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .cover-logo {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .cover-title-group h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .cover-title-group p {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: #c7d2fe;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }

    .feature-card h4 {
      margin: 0 0 3px 0;
      font-size: 10.5px;
      color: #818cf8;
      font-weight: 700;
    }

    .feature-card p {
      margin: 0;
      font-size: 9px;
      color: #e0e7ff;
      line-height: 1.35;
    }

    .cover-right {
      width: 65%;
      height: 100%;
      padding: 40px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cover-header-meta {
      text-align: right;
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .cover-main-title {
      font-size: 27px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 10px;
      letter-spacing: -0.03em;
    }

    .cover-subtitle {
      font-size: 14px;
      color: #4f46e5;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .cover-desc {
      font-size: 11px;
      color: #475569;
      line-height: 1.65;
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 12px 14px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 16px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      border-top: 2px solid #f1f5f9;
      padding-top: 16px;
    }

    .meta-item span {
      display: block;
      color: #94a3b8;
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .meta-item strong {
      color: #1e293b;
      font-size: 10px;
    }

    /* Page Header & Section Layout */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 8px;
      font-size: 8.5px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .module-section {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }

    h1.section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 5px 0;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 3px;
    }

    span.badge-tag {
      background: #3730a3;
      color: #ffffff;
      font-size: 8px;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
    }

    h2.subsection-title {
      font-size: 10px;
      font-weight: 700;
      color: #1e1b4b;
      margin: 6px 0 3px 0;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    p {
      margin: 0 0 4px 0;
      color: #334155;
    }

    /* 3W Grid Container (Where, When, Why) */
    .w3-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin: 4px 0 6px 0;
    }

    .w3-box {
      border-radius: 6px;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
    }

    .w3-box.where { background: #eff6ff; border-color: #bfdbfe; }
    .w3-box.when { background: #fefce8; border-color: #fef08a; }
    .w3-box.why { background: #f0fdf4; border-color: #bbf7d0; }

    .w3-header {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }

    .w3-box.where .w3-header { color: #1d4ed8; }
    .w3-box.when .w3-header { color: #a16207; }
    .w3-box.why .w3-header { color: #15803d; }

    .w3-body {
      font-size: 8.5px;
      color: #1e293b;
      line-height: 1.35;
      font-weight: 500;
    }

    /* UI Screenshot Frame */
    .screenshot-frame {
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin: 5px 0 6px 0;
      background: #0f172a;
      box-shadow: 0 4px 10px rgba(0,0,0,0.06);
    }

    .screenshot-header {
      background: #0f172a;
      color: #ffffff;
      padding: 4px 8px;
      font-size: 8px;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
    }

    .screenshot-frame img {
      width: 100%;
      max-height: 75mm;
      object-fit: contain;
      display: block;
      background: #ffffff;
    }

    /* SOP Steps */
    .sop-list {
      margin: 3px 0 5px 0;
      padding: 0;
      list-style: none;
    }

    .sop-step {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 3px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      padding: 4px 6px;
      border-radius: 5px;
    }

    .step-num {
      background: #3730a3;
      color: #ffffff;
      font-size: 8px;
      font-weight: 800;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-text {
      font-size: 8.5px;
      color: #334155;
      line-height: 1.35;
    }

    .step-text strong {
      color: #0f172a;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0 7px 0;
      font-size: 8.5px;
    }

    th {
      background: #1e1b4b;
      color: #ffffff;
      padding: 4px 6px;
      text-align: left;
      font-weight: 700;
      font-size: 8px;
      text-transform: uppercase;
    }

    td {
      padding: 4px 6px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .badge-access {
      display: inline-block;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 7px;
      font-weight: 700;
    }
    .badge-full { background: #dcfce7; color: #166534; }
    .badge-view { background: #dbeafe; color: #1e40af; }
    .badge-none { background: #fee2e2; color: #991b1b; }

    /* Alert / Warning / Tip Boxes */
    .info-box {
      border-left: 3px solid #3b82f6;
      background: #eff6ff;
      padding: 4px 7px;
      border-radius: 0 4px 4px 0;
      margin: 4px 0;
      font-size: 8.5px;
    }
    .info-box.tip { border-color: #10b981; background: #ecfdf5; }
    .info-box.warning { border-color: #f59e0b; background: #fffbeb; }

    ul.bullet-list {
      margin: 2px 0 4px 12px;
      padding: 0;
      font-size: 8.5px;
      color: #334155;
    }

    ul.bullet-list li {
      margin-bottom: 2px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE (Page 1) -->
  <div class="cover-container">
    <div class="cover-left">
      <div>
        <div class="cover-brand">
          <div class="cover-logo">🎓</div>
          <div class="cover-title-group">
            <h2>CoachGenie</h2>
            <p>ERP Enterprise Suite v1.0</p>
          </div>
        </div>

        <div style="margin-top: 32px;">
          <div class="feature-card">
            <h4>🏢 Multi-Tenant SaaS</h4>
            <p>Independent institute database scoping via subdomains.</p>
          </div>
          <div class="feature-card">
            <h4>🤖 AI-Powered Intelligence</h4>
            <p>LangChain RAG & Groq LLMs for live analytics and PDF reports.</p>
          </div>
          <div class="feature-card">
            <h4>💰 Full ERP Pipeline</h4>
            <p>Leads ➔ Admissions ➔ Batches ➔ Attendance ➔ Fees ➔ Receipts.</p>
          </div>
          <div class="feature-card">
            <h4>📱 Dedicated Portals</h4>
            <p>Custom web portals for Admins, Tutors, Students & Parents.</p>
          </div>
        </div>
      </div>

      <div style="font-size: 8.5px; color: #a5b4fc; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px;">
        Document Ref: CG-ENTERPRISE-MANUAL-2026<br>
        Published: August 2026 &bull; Antigravity Engineering
      </div>
    </div>

    <div class="cover-right">
      <div class="cover-header-meta">
        Official Comprehensive User Manual & Operational Reference
      </div>

      <div>
        <div class="cover-main-title">CoachGenie ERP Master Operational Guide</div>
        <div class="cover-subtitle">Complete Module-by-Module Handbook with Authentic UI Screenshots</div>
        <div class="cover-desc">
          This comprehensive manual serves as the standard operating reference for <strong>CoachGenie ERP</strong>. It details all 20 system modules across administrative, sales CRM, academic, financial, AI analytics, and self-service student/parent portals. Every module includes its exact navigation route, operational trigger timing, business value proposition, real UI capture, and step-by-step Standard Operating Procedures (SOPs).
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span>Software Release</span>
          <strong>Phase 1 Enterprise (v1.0)</strong>
        </div>
        <div class="meta-item">
          <span>Target Users</span>
          <strong>Owners, Admins, Counselors, Tutors</strong>
        </div>
        <div class="meta-item">
          <span>Architecture</span>
          <strong>Next.js 15 + FastAPI + PostgreSQL</strong>
        </div>
        <div class="meta-item">
          <span>Default Test Subdomain</span>
          <strong>http://demo.localhost:3000</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- TABLE OF CONTENTS (Page 2) -->
  <div class="header-bar">
    <span>CoachGenie ERP Master Manual</span>
    <span>Table of Contents & System Architecture Overview</span>
  </div>

  <h1 class="section-title">📌 Complete Module Sitemap & Table of Contents</h1>
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">#</th>
        <th style="width: 35%;">Module Name</th>
        <th style="width: 30%;">System Route</th>
        <th style="width: 25%;">Target User Role</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>01</strong></td><td>System Authentication & Subdomain Resolver</td><td><code>/login</code></td><td>All System Roles</td></tr>
      <tr><td><strong>02</strong></td><td>Executive Dashboard & Real-Time Analytics</td><td><code>/dashboard</code></td><td>Institute Owner / Admin</td></tr>
      <tr><td><strong>03</strong></td><td>Sales Leads & CRM Kanban Pipeline (8 Stages)</td><td><code>/leads</code></td><td>Sales Counselor / Admin</td></tr>
      <tr><td><strong>04</strong></td><td>Admissions & Document Verification Wizard</td><td><code>/admissions</code></td><td>Admin / Admission Manager</td></tr>
      <tr><td><strong>05</strong></td><td>Student Master Directory & Profile Management</td><td><code>/students</code></td><td>Admin / Counselor / Tutor</td></tr>
      <tr><td><strong>06</strong></td><td>Batch Management & Academic Capacity Setup</td><td><code>/batches</code></td><td>Admin / Academic Head</td></tr>
      <tr><td><strong>07</strong></td><td>Session Scheduling & Classroom Timetables</td><td><code>/sessions</code></td><td>Admin / Educator / Tutor</td></tr>
      <tr><td><strong>08</strong></td><td>Daily Student Attendance & Heatmap Analytics</td><td><code>/attendance</code></td><td>Tutor / Center Admin</td></tr>
      <tr><td><strong>09</strong></td><td>Exams, Scorecards & Batch Class Rankings</td><td><code>/exams</code></td><td>Tutor / Exam Coordinator</td></tr>
      <tr><td><strong>10</strong></td><td>Holistic Student Growth Cards & Feedback</td><td><code>/growth-cards</code></td><td>Tutor / Class Counselor</td></tr>
      <tr><td><strong>11</strong></td><td>Course Fee Structure Templates & Scholarships</td><td><code>/fees</code></td><td>Admin / Financial Officer</td></tr>
      <tr><td><strong>12</strong></td><td>Fee Invoicing, Billing & Payment Settlement</td><td><code>/billing</code></td><td>Admin / Cashier</td></tr>
      <tr><td><strong>13</strong></td><td>Automated Notifications & Background Cron</td><td><code>/notifications</code></td><td>Automated System Scheduler</td></tr>
      <tr><td><strong>14</strong></td><td>AI Copilot Natural Language Chat Assistant</td><td><code>/ai</code></td><td>Admin / Tutor / Student</td></tr>
      <tr><td><strong>15</strong></td><td>Staff Management & Role-Based Access (RBAC)</td><td><code>/settings/users</code></td><td>Institute Owner / Super Admin</td></tr>
      <tr><td><strong>16</strong></td><td>Student & Parent Dedicated Self-Service Portals</td><td><code>apps/student</code>, <code>apps/parent</code></td><td>Student / Parent</td></tr>
    </tbody>
  </table>

  <h1 class="section-title" style="margin-top: 10px;">🏗️ End-to-End Operational Pipeline</h1>
  <p>CoachGenie ERP unites sales, admissions, academics, billing, and AI insights into a synchronized data flow:</p>
  
  <div style="background: #0f172a; color: #f8fafc; border-radius: 6px; padding: 7px 9px; margin: 4px 0; font-family: monospace; font-size: 8.5px; line-height: 1.4;">
    <div style="color: #818cf8; font-weight: 700; font-family: sans-serif; margin-bottom: 2px; display: flex; justify-content: space-between;">
      <span>OPERATIONAL DATA LIFECYCLE</span>
      <span>ROW-LEVEL TENANT ISOLATED</span>
    </div>
[1. Lead Inquiry] ➔ [2. CRM Kanban Stage] ➔ [3. 1-Click Convert to Admission] ➔ [4. Document Verification]
                                                                                            │
[8. PDF Fee Receipt] ◄── [7. Log Payment] ◄── [6. Auto Fee Invoice] ◄── [5. Assign Batch & Student ID]
          │
[9. Mark Attendance] ➔ [10. Conduct Exam & Rank] ➔ [11. AI Growth Insights] ➔ [12. Parent Notification]
  </div>

  <div class="page-break"></div>

  <!-- MODULE 1: AUTHENTICATION (Page 3) -->
  <div class="header-bar">
    <span>Module 1: Authentication & Subdomain Resolver</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>1. Authentication, Subdomain Resolution & Tenant Setup</span>
      <span class="badge-tag">SECURITY & ACCESS</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Route: <code>/login</code><br>Subdomain URL: <code>http://[tenant].localhost:3000/login</code></div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Daily staff check-in, onboarding new staff/students, switching roles, or tenant initialization.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Guarantees strict tenant data separation, encrypted JWT session cookies, and role-scoped dashboard routing.</div>
      </div>
    </div>

    ${imgLogin ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 1.0: LIVE COACHGENIE MULTI-TENANT LOGIN INTERFACE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgLogin}" alt="CoachGenie Login Interface" />
    </div>` : ''}

    <h2 class="subsection-title">📋 Step-by-Step Standard Operating Procedure (SOP)</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text">Open browser and navigate to <code>http://localhost:3000/login</code>.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text">Enter your Institute's assigned <strong>Subdomain</strong> (e.g., <code>demo</code>).</div></li>
      <li class="sop-step"><div class="step-num">3</div><div class="step-text">Enter your registered email address and password. Click <strong>Sign In</strong>.</div></li>
      <li class="sop-step"><div class="step-num">4</div><div class="step-text">Upon authentication, you are redirected to your role portal: Owners to <code>/dashboard</code>, Counselors to <code>/leads</code>, Tutors to <code>/batches</code>, and Students to the Student Portal.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 2: DASHBOARD (Page 4) -->
  <div class="header-bar">
    <span>Module 2: Executive Dashboard & Business Analytics</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>2. Executive Dashboard & Real-Time Business Analytics</span>
      <span class="badge-tag">ADMIN & OWNER</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Route: <code>/dashboard</code><br>Primary Sidebar Menu</div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Daily morning executive check-in, weekly sales review, and monthly board audits.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Provides 360-degree real-time visibility into revenue, pending fee dues, lead conversion rates, and batch attendance.</div>
      </div>
    </div>

    ${imgDashboard ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 2.0: LIVE EXECUTIVE OWNER DASHBOARD WITH REVENUE & ENROLLMENT ANALYTICS</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgDashboard}" alt="CoachGenie Dashboard Interface" />
    </div>` : ''}

    <h2 class="subsection-title">📊 Key Executive Metrics & Operational Controls</h2>
    <ul class="bullet-list">
      <li><strong>Total Revenue Collected:</strong> Real-time sum of all settled payments for the month and fiscal year.</li>
      <li><strong>Pending Fee Dues:</strong> Live aggregate of unpaid invoices past due date. Click to navigate directly to unpaid invoices.</li>
      <li><strong>Sales Funnel Conversion:</strong> Conversion percentage tracking inquiries from <code>New</code> to <code>Enrolled</code>.</li>
      <li><strong>Batch Attendance Health:</strong> Visual indicators highlighting course batches with attendance below 75%.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 3: LEADS CRM (Page 5) -->
  <div class="header-bar">
    <span>Module 3: Sales Leads & CRM Pipeline</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>3. Sales Leads & CRM Pipeline (8-Stage Kanban)</span>
      <span class="badge-tag">COUNSELOR & CRM</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Route: <code>/leads</code><br>Sales & CRM Navigation Section</div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Whenever an inquiry arrives via phone, website form, walk-in, or social campaign.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Eliminates lost inquiries, tracks follow-up dates, measures counselor productivity, and enables 1-click admission conversion.</div>
      </div>
    </div>

    ${imgLeads ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 3.0: LIVE SALES CRM 8-STAGE KANBAN PIPELINE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgLeads}" alt="CoachGenie Leads Interface" />
    </div>` : ''}

    <h2 class="subsection-title">⚡ Kanban Pipeline Stages Detailed SOP</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text"><strong>Capture Lead:</strong> Click <strong>+ Add Lead</strong>. Enter Candidate Name, Phone Number, Target Course (e.g. <em>Class 12 NEET</em>), Lead Source, and Priority.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text"><strong>Pipeline Progression:</strong> Drag lead cards across 8 stages: <code>New</code> ➔ <code>Contacted</code> ➔ <code>Interested</code> ➔ <code>Demo Scheduled</code> ➔ <code>Demo Done</code> ➔ <code>Negotiation</code> ➔ <code>Enrolled</code> ➔ <code>Lost</code>.</div></li>
      <li class="sop-step"><div class="step-num">3</div><div class="step-text"><strong>Follow-Up Drawer:</strong> Click any lead card to open the Lead Drawer. Log call notes, set reminder alerts, and send course brochures.</div></li>
      <li class="sop-step"><div class="step-num">4</div><div class="step-text"><strong>1-Click Conversion:</strong> When a student enrolls, click <strong>Convert to Admission</strong> to automatically pre-populate their data into the Admission Wizard.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 4: ADMISSIONS (Page 6) -->
  <div class="header-bar">
    <span>Module 4: Admissions & Document Verification</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>4. Admissions & Document Verification Wizard</span>
      <span class="badge-tag">ADMISSIONS & ONBOARDING</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Route: <code>/admissions</code><br>Admissions Management Section</div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">When student enrolls, reviewing submitted ID documents, and assigning course batches.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Validates student eligibility, auto-generates official Student IDs, and links to fee billing plans.</div>
      </div>
    </div>

    ${imgAdmissions ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 4.0: LIVE STUDENT ADMISSION VERIFICATION & APPROVAL INTERFACE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgAdmissions}" alt="CoachGenie Admissions Interface" />
    </div>` : ''}

    <h2 class="subsection-title">📋 Admission Approval SOP</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text">Open <code>/admissions</code> to review pending applications converted from sales leads.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text">Verify student photo, parent contact numbers, ID proof documents, and previous school marksheets.</div></li>
      <li class="sop-step"><div class="step-num">3</div><div class="step-text">Select target <strong>Batch</strong> and <strong>Fee Template</strong>. Click <strong>Approve & Register</strong>.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 5: STUDENTS (Page 7) -->
  <div class="header-bar">
    <span>Module 5: Student Master Directory</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>5. Student Master Directory & Profile Management</span>
      <span class="badge-tag">STUDENT MASTER DATA</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Route: <code>/students</code><br>Student Directory Navigation</div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Looking up student contact info, checking fee dues, viewing academic attendance and exam history.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Centralizes 360° student records including personal, academic, attendance, and financial history.</div>
      </div>
    </div>

    ${imgStudents ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 5.0: LIVE STUDENT MASTER DIRECTORY & PROFILE INTERFACE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgStudents}" alt="CoachGenie Students Directory" />
    </div>` : ''}

    <h2 class="subsection-title">📋 Student Profile Lookup SOP</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text">Go to <code>/students</code> and use the search bar to find students by Name, ID, or Batch.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text">Click on any student row to view their full profile: Batch enrollment, Fee dues, and Exam reports.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 6 & 7: BATCHES & SESSIONS (Page 8) -->
  <div class="header-bar">
    <span>Modules 6 & 7: Batches & Session Timetables</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>6 & 7. Batch Management & Classroom Session Timetables</span>
      <span class="badge-tag">ACADEMIC TIMETABLE</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Routes: <code>/batches</code> & <code>/sessions</code></div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Term start, scheduling weekly classes, allocating classrooms, and assigning faculty.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Eliminates room clashes, manages classroom capacity, and creates structured academic schedules.</div>
      </div>
    </div>

    ${imgBatches ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 6.0: LIVE BATCH MANAGEMENT & SYLLABUS INTERFACE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgBatches}" alt="CoachGenie Batches Interface" />
    </div>` : ''}

    ${imgSessions ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 6.1: LIVE CLASSROOM SESSIONS & TIMETABLE SCHEDULER</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgSessions}" alt="CoachGenie Sessions Interface" />
    </div>` : ''}

    <h2 class="subsection-title">📋 Batch & Timetable Setup SOP</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text"><strong>Create Batch:</strong> Go to <code>/batches</code>, click <strong>+ Create Batch</strong>. Define Course Name, Max Capacity, and assign Tutors.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text"><strong>Create Sessions:</strong> Go to <code>/sessions</code> to schedule weekly recurring class slots.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 8: ATTENDANCE (Page 9) -->
  <div class="header-bar">
    <span>Module 8: Daily Attendance & Heatmaps</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>8. Daily Student Attendance & Heatmap Analytics</span>
      <span class="badge-tag">TUTOR & ATTENDANCE</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Route: <code>/attendance</code><br>Classroom Operations Section</div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Daily during or immediately following every scheduled class session.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Maintains attendance compliance, identifies habitual absenteeism, and sends instant parent alerts.</div>
      </div>
    </div>

    ${imgAttendance ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 7.0: LIVE ATTENDANCE MARKING & MONTHLY HEATMAP INTERFACE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgAttendance}" alt="CoachGenie Attendance Interface" />
    </div>` : ''}

    <h2 class="subsection-title">📋 Attendance Logging SOP</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text">Open <code>/attendance</code>, select the Date, Batch, and Class Session.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text">Mark student status: <code>Present</code> (Green), <code>Absent</code> (Red), or <code>Late</code> (Yellow).</div></li>
      <li class="sop-step"><div class="step-num">3</div><div class="step-text">Click <strong>Save Attendance</strong>. Attendance heatmaps and percentages update in real-time.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 9 & 10: EXAMS & GROWTH CARDS (Page 10) -->
  <div class="header-bar">
    <span>Modules 9 & 10: Exams & Student Growth Cards</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>9 & 10. Exams, Marksheets, Class Rankings & Growth Cards</span>
      <span class="badge-tag">EXAMS & ASSESSMENT</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Routes: <code>/exams</code> & <code>/growth-cards</code></div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Weekly tests, unit exams, mock tests, and end-of-month Parent-Teacher Meetings (PTM).</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Automates score ranking, calculates batch pass percentages, and records qualitative student growth.</div>
      </div>
    </div>

    ${imgExams ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 8.0: LIVE EXAM CREATION & MARKSHEET MANAGEMENT INTERFACE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgExams}" alt="CoachGenie Exams Interface" />
    </div>` : ''}

    ${imgGrowthCards ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 8.1: LIVE HOLISTIC STUDENT GROWTH CARDS & FEEDBACK</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgGrowthCards}" alt="CoachGenie Growth Cards Interface" />
    </div>` : ''}

    <h2 class="subsection-title">🏆 Exam Creation & Score Entry SOP</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text"><strong>Create Exam:</strong> Go to <code>/exams</code>, click <strong>+ Create Exam</strong>. Define Exam Title, Subject, Batch, Exam Date, Max Marks, and Passing Marks.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text"><strong>Enter Scores:</strong> Click <strong>Enter Marks</strong> to record individual student scores.</div></li>
      <li class="sop-step"><div class="step-num">3</div><div class="step-text"><strong>Publish Results:</strong> Click <strong>Publish Results</strong>. The system auto-calculates percentages, grades, class ranks, and generates student scorecards.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 11 & 12: FEES & BILLING (Page 11) -->
  <div class="header-bar">
    <span>Modules 11 & 12: Fee Invoicing & Payment Billing</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>11 & 12. Fee Invoicing, Billing & Payment Receipts</span>
      <span class="badge-tag">FINANCIAL ERP</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Routes: <code>/fees</code> & <code>/billing</code></div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Course enrollment, installment due dates, fee collections, and payment receipt issuance.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Automates fee templates, calculates custom discounts, tracks unpaid balances, and prints official receipts.</div>
      </div>
    </div>

    ${imgFees ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 9.0: LIVE FEE MANAGEMENT & INVOICE TRACKER</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgFees}" alt="CoachGenie Fees Interface" />
    </div>` : ''}

    ${imgBilling ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 9.1: LIVE PAYMENT BILLING & SETTLEMENT INTERFACE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgBilling}" alt="CoachGenie Billing Interface" />
    </div>` : ''}

    <h2 class="subsection-title">📋 Fee Processing & Receipt SOP</h2>
    <ol class="sop-list">
      <li class="sop-step"><div class="step-num">1</div><div class="step-text"><strong>Generate Invoice:</strong> Click <strong>+ New Invoice</strong>. Select Student, Fee Structure, apply discounts, and set installment due dates.</div></li>
      <li class="sop-step"><div class="step-num">2</div><div class="step-text"><strong>Log Payment:</strong> Click <strong>Log Payment</strong> on the invoice card. Enter Amount Paid, Payment Mode (Cash, UPI, Net Banking), and Transaction Reference.</div></li>
      <li class="sop-step"><div class="step-num">3</div><div class="step-text"><strong>Issue Receipt:</strong> Status updates to <code>PAID</code>. Click <strong>Download PDF Receipt</strong> to issue official receipt to parent.</div></li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 13 & 14: NOTIFICATIONS & AI COPILOT (Page 12) -->
  <div class="header-bar">
    <span>Modules 13 & 14: Notifications & AI Copilot</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>13 & 14. Automated Notifications & AI Copilot Assistant</span>
      <span class="badge-tag">AI & AUTOMATION</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body">Routes: <code>/notifications</code> & <code>/ai</code></div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Overdue fee reminders, attendance alerts, daily AI queries, and PDF diagnostic reports.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Automates communication with parents and transforms raw institute data into actionable AI insights.</div>
      </div>
    </div>

    ${imgNotifications ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 10.0: LIVE NOTIFICATIONS & ALERT CENTER</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgNotifications}" alt="CoachGenie Notifications Interface" />
    </div>` : ''}

    ${imgAI ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 10.1: LIVE AI COPILOT ANALYTICS & INSIGHTS ENGINE</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgAI}" alt="CoachGenie AI Interface" />
    </div>` : ''}

    <h2 class="subsection-title">🤖 AI Assistant Capabilities & Queries</h2>
    <ul class="bullet-list">
      <li><strong>Weak Student Diagnostics:</strong> Ask *"Which students scored below 50% in Physics this month?"* for instant remedial lists.</li>
      <li><strong>Revenue Projections:</strong> Ask *"What is the projected fee collection for next month?"* for predictive financial estimates.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- MODULE 15 & 16: SETTINGS, RBAC & PORTALS (Page 13) -->
  <div class="header-bar">
    <span>Modules 15 & 16: Staff RBAC & Student/Parent Portals</span>
    <span>CoachGenie ERP Master Manual</span>
  </div>

  <div class="module-section">
    <h1 class="section-title">
      <span>15 & 16. Staff Management, RBAC & Self-Service Portals</span>
      <span class="badge-tag">SETTINGS & PORTALS</span>
    </h1>

    <div class="w3-grid">
      <div class="w3-box where">
        <div class="w3-header">📍 WHERE TO USE</div>
        <div class="w3-body"><code>/settings/users</code><br>Student Portal: <code>apps/student</code><br>Parent Portal: <code>apps/parent</code></div>
      </div>
      <div class="w3-box when">
        <div class="w3-header">⏰ WHEN TO USE</div>
        <div class="w3-body">Staff onboarding, updating permissions, and continuous 24/7 student/parent self-service access.</div>
      </div>
      <div class="w3-box why">
        <div class="w3-header">💡 WHY TO USE</div>
        <div class="w3-body">Enforces security scoping for staff and provides complete fee & academic transparency to parents.</div>
      </div>
    </div>

    ${imgSettings ? `
    <div class="screenshot-frame">
      <div class="screenshot-header">
        <span>FIGURE 11.0: LIVE STAFF MANAGEMENT & USER ROLE RBAC</span>
        <span>LIVE APPLICATION CAPTURE</span>
      </div>
      <img src="${imgSettings}" alt="CoachGenie Settings Interface" />
    </div>` : ''}

    <h2 class="subsection-title">🔐 Role Permissions Matrix</h2>
    <table>
      <thead>
        <tr>
          <th>Module Name</th>
          <th>Owner / Admin</th>
          <th>Sales Counselor</th>
          <th>Tutor / Educator</th>
          <th>Student / Parent</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Executive Dashboard & Revenue</strong></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-none">No Access</span></td>
          <td><span class="badge-access badge-none">No Access</span></td>
          <td><span class="badge-access badge-none">No Access</span></td>
        </tr>
        <tr>
          <td><strong>Sales Leads & CRM Pipeline</strong></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-none">No Access</span></td>
          <td><span class="badge-access badge-none">No Access</span></td>
        </tr>
        <tr>
          <td><strong>Batches & Timetable</strong></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-view">View Only</span></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-view">View Own</span></td>
        </tr>
        <tr>
          <td><strong>Attendance & Exams Entry</strong></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-none">No Access</span></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-view">View Own</span></td>
        </tr>
        <tr>
          <td><strong>Fee Invoices & Payments</strong></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-view">View Only</span></td>
          <td><span class="badge-access badge-none">No Access</span></td>
          <td><span class="badge-access badge-view">View Own</span></td>
        </tr>
        <tr>
          <td><strong>AI Copilot Assistant</strong></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
          <td><span class="badge-access badge-full">Full Access</span></td>
        </tr>
      </tbody>
    </table>

    <div class="info-box tip">
      <strong>💡 Student & Parent Portals:</strong> Students access their timetable, syllabus tracker, and AI study buddy via the Student App. Parents access real-time fee receipts, attendance percentages, and exam report cards via the Parent App.
    </div>
  </div>

</body>
</html>`;

  const htmlPath = path.join(__dirname, 'CoachGenie_Professional_User_Manual.html');
  const pdfPath = path.join(__dirname, 'CoachGenie_Professional_User_Manual.pdf');

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`Saved HTML manual to ${htmlPath}`);

  console.log("Launching headless Playwright Chromium browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Loading HTML file: ${htmlPath}`);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

  console.log("Generating PDF...");
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      right: '12mm',
      bottom: '12mm',
      left: '12mm'
    }
  });

  await browser.close();
  console.log(`SUCCESS! Ultimate Enterprise User Manual PDF generated successfully at: ${pdfPath}`);
}

buildUltimateManual().catch(err => {
  console.error("Error generating Ultimate PDF Manual:", err);
  process.exit(1);
});
