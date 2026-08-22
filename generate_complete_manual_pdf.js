const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generatePDFManual() {
  console.log("Starting Enterprise PDF Manual Generation (Perfect Page Fill Version)...");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CoachGenie ERP - Comprehensive Enterprise User Manual</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 0;
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

    /* Fixed A4 Page Container (Exactly 297mm height) */
    .pdf-page {
      width: 210mm;
      height: 297mm;
      padding: 12mm 14mm 12mm 14mm;
      position: relative;
      background: #ffffff;
      page-break-after: always;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .pdf-page:last-child {
      page-break-after: avoid;
    }

    /* Cover Page Styling */
    .cover-page {
      padding: 0;
      flex-direction: row;
    }

    .cover-left {
      width: 34%;
      height: 100%;
      background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #4338ca 100%);
      padding: 40px 24px;
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
      border-radius: 14px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .cover-left-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .cover-left-subtitle {
      font-size: 11px;
      color: #c7d2fe;
      margin-top: 2px;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .feature-card h4 {
      margin: 0 0 4px 0;
      font-size: 11px;
      color: #818cf8;
      font-weight: 700;
    }

    .feature-card p {
      margin: 0;
      font-size: 9.5px;
      color: #e0e7ff;
      line-height: 1.4;
    }

    .cover-right {
      width: 66%;
      height: 100%;
      padding: 46px 36px 36px 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cover-main-title {
      font-size: 28px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 12px;
      letter-spacing: -0.03em;
    }

    .cover-subtitle {
      font-size: 14px;
      color: #4f46e5;
      font-weight: 700;
      margin-bottom: 18px;
    }

    .cover-desc {
      font-size: 11px;
      color: #475569;
      line-height: 1.7;
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 20px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      border-top: 2px solid #f1f5f9;
      padding-top: 18px;
    }

    .meta-item span {
      display: block;
      color: #94a3b8;
      font-weight: 700;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .meta-item strong {
      color: #1e293b;
      font-size: 10.5px;
    }

    /* Page Header & Footer */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 10px;
      font-size: 8.5px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
      margin-top: auto;
      font-size: 8px;
      color: #94a3b8;
    }

    .module-card {
      margin-bottom: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }

    h1.section-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    span.badge-tag {
      background: #4338ca;
      color: #ffffff;
      font-size: 8px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
    }

    h2.subsection-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #1e1b4b;
      margin: 6px 0 3px 0;
    }

    p {
      margin: 0 0 5px 0;
      color: #334155;
    }

    /* 3W Grid Container */
    .w3-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin: 5px 0 6px 0;
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

    /* SOP Steps List */
    .sop-list {
      margin: 3px 0 6px 0;
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

    /* UI Diagram / Callout Mockup Boxes */
    .ui-box {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 6px;
      padding: 7px 9px;
      margin: 5px 0;
      font-family: monospace;
      font-size: 8.5px;
      line-height: 1.4;
    }

    .ui-box-title {
      color: #818cf8;
      font-weight: 700;
      font-family: sans-serif;
      font-size: 8.5px;
      margin-bottom: 3px;
      display: flex;
      justify-content: space-between;
    }

    /* Table Styling */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0;
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

    .info-box {
      border-left: 3px solid #3b82f6;
      background: #eff6ff;
      padding: 5px 7px;
      border-radius: 0 4px 4px 0;
      margin: 5px 0;
      font-size: 8.5px;
    }
    .info-box.tip { border-color: #10b981; background: #ecfdf5; }
    .info-box.warning { border-color: #f59e0b; background: #fffbeb; }

    ul.bullet-list {
      margin: 2px 0 5px 12px;
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

  <!-- PAGE 1: COVER PAGE -->
  <div class="pdf-page cover-page">
    <div class="cover-left">
      <div>
        <div class="cover-brand">
          <div class="cover-logo">🎓</div>
          <div>
            <div class="cover-left-title">CoachGenie</div>
            <div class="cover-left-subtitle">ERP Enterprise Suite</div>
          </div>
        </div>

        <div style="margin-top: 36px;">
          <div class="feature-card">
            <h4>🏢 Multi-Tenant SaaS</h4>
            <p>Complete data isolation & subdomain access per institute.</p>
          </div>
          <div class="feature-card">
            <h4>🤖 AI-Powered Copilot</h4>
            <p>LangChain RAG & Groq LLM for instant analytics & PDF reports.</p>
          </div>
          <div class="feature-card">
            <h4>💰 End-to-End ERP Flow</h4>
            <p>Leads ➔ Admissions ➔ Batches ➔ Exams ➔ Invoices ➔ Receipts.</p>
          </div>
        </div>
      </div>

      <div style="font-size: 9px; color: #a5b4fc; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px;">
        Document Ref: CG-MANUAL-2026-V1<br>
        Published: August 2026
      </div>
    </div>

    <div class="cover-right">
      <div>
        <div style="text-align: right; font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 18px;">
          Official Enterprise Manual & Operational Guide
        </div>

        <div class="cover-main-title">Complete User Manual & Operational Guide</div>
        <div class="cover-subtitle">Exhaustive Module-by-Module Reference: Where, When & Why to Use</div>
        <div class="cover-desc">
          This manual details every single module, workflow, role matrix, and standard operating procedure (SOP) in <strong>CoachGenie ERP</strong>. Designed for Institute Owners, Sales Counselors, Educators, Tutors, and Financial Officers, it provides explicit step-by-step guidance on system navigation, trigger conditions, business ROI, and best practices.
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span>System Version</span>
          <strong>v1.0 (Phase 1 Release)</strong>
        </div>
        <div class="meta-item">
          <span>Target Roles</span>
          <strong>Owners, Admins, Counselors, Tutors</strong>
        </div>
        <div class="meta-item">
          <span>Supported Browsers</span>
          <strong>Chrome, Edge, Firefox, Safari</strong>
        </div>
        <div class="meta-item">
          <span>Default Subdomain</span>
          <strong>http://demo.localhost:3000</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 2: TABLE OF CONTENTS & SYSTEM ARCHITECTURE -->
  <div class="pdf-page">
    <div>
      <div class="header-bar">
        <span>CoachGenie ERP Enterprise Manual</span>
        <span>Table of Contents & System Architecture</span>
      </div>

      <h1 class="section-title">📌 Table of Contents & Module Sitemap</h1>
      <table>
        <thead>
          <tr>
            <th style="width: 12%;">Module #</th>
            <th style="width: 38%;">Module Name</th>
            <th style="width: 30%;">Primary System Route</th>
            <th style="width: 20%;">Target User Role</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Module 1</strong></td><td>Authentication, Tenant Access & Subdomain Setup</td><td><code>/login</code></td><td>All User Roles</td></tr>
          <tr><td><strong>Module 2</strong></td><td>Executive Dashboard & Business Analytics</td><td><code>/dashboard</code></td><td>Institute Owner / Admin</td></tr>
          <tr><td><strong>Module 3</strong></td><td>Sales Leads & CRM Pipeline (8-Stage Kanban)</td><td><code>/leads</code></td><td>Sales Counselor / Admin</td></tr>
          <tr><td><strong>Module 4</strong></td><td>Admissions & Student Master Management</td><td><code>/admissions</code>, <code>/students</code></td><td>Admin / Admission Manager</td></tr>
          <tr><td><strong>Module 5</strong></td><td>Batch Setup, Timetable & Session Management</td><td><code>/batches</code>, <code>/sessions</code></td><td>Admin / Educator / Tutor</td></tr>
          <tr><td><strong>Module 6</strong></td><td>Syllabus Progress Tracker</td><td><code>/batches</code> (Syllabus Tab)</td><td>Tutor / Academic Head</td></tr>
          <tr><td><strong>Module 7</strong></td><td>Daily Attendance & Heatmap Analytics</td><td><code>/attendance</code></td><td>Tutor / Admin</td></tr>
          <tr><td><strong>Module 8</strong></td><td>Exams, Scorecards & Class Rankings</td><td><code>/exams</code></td><td>Tutor / Exam Coordinator</td></tr>
          <tr><td><strong>Module 9</strong></td><td>Holistic Student Growth Cards</td><td><code>/growth-cards</code></td><td>Tutor / Class Counselor</td></tr>
          <tr><td><strong>Module 10</strong></td><td>Fee Invoicing, Billing & Receipts</td><td><code>/fees</code>, <code>/billing</code></td><td>Admin / Accountant</td></tr>
          <tr><td><strong>Module 11</strong></td><td>Automated Notifications & Background Scheduler</td><td><code>/notifications</code> (Background)</td><td>Automated System Cron</td></tr>
          <tr><td><strong>Module 12</strong></td><td>AI Copilot Assistant & PDF Reports Engine</td><td><code>/ai</code>, <code>/reports</code></td><td>Admin / Tutor / Student</td></tr>
          <tr><td><strong>Module 13</strong></td><td>Staff, Roles & Access Control (RBAC)</td><td><code>/settings/users</code></td><td>Institute Owner / Admin</td></tr>
          <tr><td><strong>Module 14</strong></td><td>Student & Parent Self-Service Portals</td><td><code>apps/student</code>, <code>apps/parent</code></td><td>Enrolled Student / Parent</td></tr>
        </tbody>
      </table>

      <h1 class="section-title" style="margin-top: 12px;">🏗️ End-to-End System Operational Pipeline</h1>
      <p>CoachGenie ERP connects all coaching operations into a single multi-tenant data stream:</p>
      
      <div class="ui-box">
        <div class="ui-box-title">
          <span>COACHGENIE ERP OPERATIONAL PIPELINE</span>
          <span>MULTI-TENANT ROW ISOLATED DATA</span>
        </div>
[1. Inquiry Received] ➔ [2. CRM Kanban Stage] ➔ [3. Convert to Admission] ➔ [4. Document Verification]
                                                                                          │
[8. PDF Payment Receipt] ◄── [7. Log Payment] ◄── [6. Auto Fee Invoice] ◄── [5. Assign Batch & Student ID]
          │
[9. Log Daily Attendance] ➔ [10. Conduct Exam & Rank] ➔ [11. AI Growth Insights] ➔ [12. Parent Notification]
      </div>

      <div class="info-box tip">
        <strong>💡 Multi-Tenancy Guarantee:</strong> All student records, fee collections, exam marks, and batch schedules are strictly isolated per institute using row-level <code>tenant_id</code> database filters.
      </div>

      <h2 class="subsection-title">🚀 Executive Quick Start Checklist</h2>
      <ul class="bullet-list">
        <li><strong>Step 1:</strong> Log in via <code>http://[tenant].localhost:3000/login</code> using Owner credentials.</li>
        <li><strong>Step 2:</strong> Configure Course Batches and Fee Structure Templates under <code>/batches</code> & <code>/fees</code>.</li>
        <li><strong>Step 3:</strong> Onboard Counselors and Tutors under <code>/settings/users</code>.</li>
        <li><strong>Step 4:</strong> Begin capturing inquiries on the CRM Kanban pipeline at <code>/leads</code>.</li>
      </ul>
    </div>

    <div class="footer-bar">
      <span>CoachGenie ERP Enterprise Manual v1.0</span>
      <span>Page 2 of 7</span>
    </div>
  </div>

  <!-- PAGE 3: MODULES 1 & 2 -->
  <div class="pdf-page">
    <div>
      <div class="header-bar">
        <span>Modules 1 & 2: Setup & Executive Dashboard</span>
        <span>CoachGenie ERP Manual</span>
      </div>

      <!-- MODULE 1 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 1: Authentication, Tenant Access & Subdomain Setup</span>
          <span class="badge-tag">SECURITY & ACCESS</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body">Route: <code>/login</code><br>Subdomain URL: <code>http://[tenant].localhost:3000/login</code></div>
          </div>
          <div class="w3-box when">
            <div class="w3-header">⏰ WHEN TO USE</div>
            <div class="w3-body">Daily staff check-in, onboarding new staff/students, switching roles, or initializing a new institute.</div>
          </div>
          <div class="w3-box why">
            <div class="w3-header">💡 WHY TO USE</div>
            <div class="w3-body">Guarantees strict tenant data separation, encrypted JWT session cookies, and role-scoped dashboard routing.</div>
          </div>
        </div>

        <h2 class="subsection-title">⚡ Key Features & Controls</h2>
        <ul class="bullet-list">
          <li><strong>Subdomain Resolution:</strong> Automatically maps HTTP requests to tenant database rows via <code>X-Tenant-Subdomain</code> header.</li>
          <li><strong>Role Redirection:</strong> Redirects Owners to <code>/dashboard</code>, Counselors to <code>/leads</code>, Tutors to <code>/batches</code>, and Students to the Student App.</li>
          <li><strong>JWT Refresh Mechanism:</strong> Axios interceptors automatically request new access tokens upon 401 response without dropping session state.</li>
        </ul>

        <h2 class="subsection-title">📋 Step-by-Step Standard Operating Procedure (SOP)</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text">Open browser and navigate to <code>http://localhost:3000/login</code> (or custom institute subdomain URL).</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text">Enter your assigned <strong>Institute Subdomain</strong> (e.g., <code>demo</code>).</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text">Enter your registered email address and password. Click <strong>Sign In</strong>.</div></li>
          <li class="sop-step"><div class="step-num">4</div><div class="step-text">Backend validates password hash (bcrypt), sets encrypted JWT cookie, and redirects to your portal.</div></li>
        </ol>

        <div class="info-box warning">
          <strong>⚠️ Subdomain Troubleshooting:</strong> If login returns "Invalid Tenant", verify your subdomain matches your institute account. Clear cookies when testing multiple demo accounts.
        </div>
      </div>

      <!-- MODULE 2 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 2: Executive Dashboard & Business Analytics</span>
          <span class="badge-tag">ADMIN & OWNER</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body">Route: <code>/dashboard</code><br>Main Navigation Sidebar</div>
          </div>
          <div class="w3-box when">
            <div class="w3-header">⏰ WHEN TO USE</div>
            <div class="w3-body">Every morning during executive check-in, and during weekly/monthly financial & operational reviews.</div>
          </div>
          <div class="w3-box why">
            <div class="w3-header">💡 WHY TO USE</div>
            <div class="w3-body">Provides 360-degree real-time visibility into revenue, pending fee dues, lead conversion rates, and batch health.</div>
          </div>
        </div>

        <h2 class="subsection-title">📊 Key Executive Metrics & Operational Controls</h2>
        <ul class="bullet-list">
          <li><strong>Revenue Collection Chart:</strong> Real-time visual comparison of settled payments versus monthly collection targets. Hover to view daily breakdowns.</li>
          <li><strong>Pending Fee Dues Summary:</strong> Total outstanding fee balance across all active student accounts. Click to view unpaid invoices.</li>
          <li><strong>Lead Conversion Funnel:</strong> Real-time conversion percentages across sales counselors from <code>New</code> inquiry to <code>Enrolled</code> student.</li>
          <li><strong>Batch Attendance Health:</strong> Average daily attendance percentage across all active batches, highlighting low-attendance groups (&lt;75%).</li>
        </ul>

        <h2 class="subsection-title">📋 Executive Daily Check-in SOP</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text">Log in as Owner/Admin and navigate to <code>/dashboard</code>.</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text">Review <strong>Pending Dues Widget</strong> to identify urgent fee collection priorities.</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text">Inspect <strong>Lead Conversion Rate</strong> to monitor counselor pipeline momentum.</div></li>
        </ol>
      </div>
    </div>

    <div class="footer-bar">
      <span>CoachGenie ERP Enterprise Manual v1.0</span>
      <span>Page 3 of 7</span>
    </div>
  </div>

  <!-- PAGE 4: MODULES 3 & 4 -->
  <div class="pdf-page">
    <div>
      <div class="header-bar">
        <span>Modules 3 & 4: CRM Pipeline & Student Admissions</span>
        <span>CoachGenie ERP Manual</span>
      </div>

      <!-- MODULE 3 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 3: Sales Leads & CRM Pipeline (8-Stage Kanban)</span>
          <span class="badge-tag">SALES & CRM</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body">Route: <code>/leads</code><br>Sales CRM Section</div>
          </div>
          <div class="w3-box when">
            <div class="w3-header">⏰ WHEN TO USE</div>
            <div class="w3-body">Whenever a student inquiry arrives via phone, website form, walk-in, social media, or referral.</div>
          </div>
          <div class="w3-box why">
            <div class="w3-header">💡 WHY TO USE</div>
            <div class="w3-body">Eliminates lost inquiries, structures sales follow-ups, measures counselor productivity, and enables 1-click conversion.</div>
          </div>
        </div>

        <h2 class="subsection-title">⚡ Kanban Pipeline Stages Detailed Breakdown</h2>
        <ul class="bullet-list">
          <li><code>New</code>: Fresh inquiries received from web forms or phone calls.</li>
          <li><code>Contacted</code>: Initial counselor outreach completed via phone or WhatsApp.</li>
          <li><code>Interested</code>: Candidate confirmed interest in specific course batches.</li>
          <li><code>Demo Scheduled / Done</code>: Student scheduled or completed a trial demo class session.</li>
          <li><code>Negotiation</code>: Scholarship eligibility, installment fee plans, and discounts discussed.</li>
          <li><code>Enrolled</code>: Lead converted into paying student admission.</li>
        </ul>

        <h2 class="subsection-title">📋 Lead Management Standard Operating Procedure</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text">Click <strong>+ Add Lead</strong>. Enter Candidate Name, Phone Number, Target Exam (e.g. <em>NEET 2027</em>), Lead Source, and Priority.</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text">Drag lead cards across the 8 Kanban pipeline stages as sales progress.</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text">Click any lead card to open the <strong>Lead Drawer</strong>: log call notes, set follow-up dates, and send course brochures.</div></li>
          <li class="sop-step"><div class="step-num">4</div><div class="step-text">Click <strong>Convert to Admission</strong> when enrolled. Candidate data pre-populates the official admission form.</div></li>
        </ol>
      </div>

      <!-- MODULE 4 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 4: Admissions & Student Master Management</span>
          <span class="badge-tag">ADMISSIONS & DATA</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body">Routes: <code>/admissions</code> & <code>/students</code></div>
          </div>
          <div class="w3-box when">
            <div class="w3-header">⏰ WHEN TO USE</div>
            <div class="w3-body">During enrollment drives, student registration, document verification, photo upload, and batch allocation.</div>
          </div>
          <div class="w3-box why">
            <div class="w3-header">💡 WHY TO USE</div>
            <div class="w3-body">Centralizes master records, auto-generates unique Student Enrollment IDs, and links students to fee plans.</div>
          </div>
        </div>

        <h2 class="subsection-title">📋 Admission Verification & Registration SOP</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text">Open <code>/admissions</code> to review pending applications converted from leads or submitted online.</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text">Verify student photo, parent contact numbers, ID proof documents, and previous school marksheets.</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text">Select target <strong>Batch</strong> and <strong>Fee Template</strong>. Click <strong>Approve & Register</strong>.</div></li>
          <li class="sop-step"><div class="step-num">4</div><div class="step-text">System creates permanent profile in <code>/students</code>, assigns Student ID (e.g. <code>STU-2026-0891</code>), and issues student portal login credentials.</div></li>
        </ol>
      </div>
    </div>

    <div class="footer-bar">
      <span>CoachGenie ERP Enterprise Manual v1.0</span>
      <span>Page 4 of 7</span>
    </div>
  </div>

  <!-- PAGE 5: MODULES 5, 6 & 7 -->
  <div class="pdf-page">
    <div>
      <div class="header-bar">
        <span>Modules 5, 6 & 7: Batches, Syllabus & Attendance</span>
        <span>CoachGenie ERP Manual</span>
      </div>

      <!-- MODULE 5 & 6 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 5 & 6: Batch Setup & Syllabus Progress Tracker</span>
          <span class="badge-tag">ACADEMIC MANAGEMENT</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body">Routes: <code>/batches</code> & <code>/sessions</code></div>
          </div>
          <div class="w3-box when">
            <div class="w3-header">⏰ WHEN TO USE</div>
            <div class="w3-body">At term start, scheduling weekly class slots, and updating topic coverage after teaching sessions.</div>
          </div>
          <div class="w3-box why">
            <div class="w3-header">💡 WHY TO USE</div>
            <div class="w3-body">Prevents timetable clashes, maps faculty to subjects, and tracks syllabus completion % in real-time.</div>
          </div>
        </div>

        <h2 class="subsection-title">📖 Syllabus Tracking & Batch Operations SOP</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text">Go to <code>/batches</code>, select target batch, and click the <strong>Syllabus</strong> tab.</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text">Toggle chapter topics: <code>Not Started</code> ➔ <code>In Progress</code> ➔ <code>Completed</code>.</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text">System recalculates overall batch completion percentage and flags delayed subjects prior to exams.</div></li>
        </ol>
      </div>

      <!-- MODULE 7 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 7: Daily Attendance & Heatmap Analytics</span>
          <span class="badge-tag">TUTOR & OPERATIONAL</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body">Route: <code>/attendance</code><br>Classroom Section</div>
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

        <h2 class="subsection-title">📋 Attendance Logging SOP</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text">Navigate to <code>/attendance</code>, select Date, Batch, and Class Session.</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text">Mark student status: <code>Present</code> (Green), <code>Absent</code> (Red), or <code>Late</code> (Yellow).</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text">Click <strong>Save & Publish Attendance</strong>. Monthly percentage and attendance heatmaps update instantly.</div></li>
        </ol>

        <div class="info-box warning">
          <strong>⚠️ Low Attendance Alert:</strong> Students with attendance under 75% trigger an automated SMS/email alert to parents via the background scheduler.
        </div>
      </div>
    </div>

    <div class="footer-bar">
      <span>CoachGenie ERP Enterprise Manual v1.0</span>
      <span>Page 5 of 7</span>
    </div>
  </div>

  <!-- PAGE 6: MODULES 8, 9 & 10 -->
  <div class="pdf-page">
    <div>
      <div class="header-bar">
        <span>Modules 8, 9 & 10: Exams, Growth Cards & Fees</span>
        <span>CoachGenie ERP Manual</span>
      </div>

      <!-- MODULE 8 & 9 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 8 & 9: Exams, Scorecards & Growth Cards</span>
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

        <h2 class="subsection-title">🏆 Exam Creation & Score Entry SOP</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text">Click <strong>+ Create Exam</strong> on <code>/exams</code>. Define Total Marks, Passing Marks, Batch, and Exam Date.</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text">Enter obtained scores for each student. Click <strong>Publish Results</strong>.</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text">System auto-calculates class rank, grade percentage, and generates downloadable scorecards.</div></li>
        </ol>
      </div>

      <!-- MODULE 10 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 10: Fee Invoicing, Billing & Receipts</span>
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

        <h2 class="subsection-title">📋 Fee Processing & Receipt SOP</h2>
        <ol class="sop-list">
          <li class="sop-step"><div class="step-num">1</div><div class="step-text"><strong>Generate Invoice:</strong> Click <strong>+ New Invoice</strong>. Select Student, Fee Structure, apply scholarship discount, and set due dates.</div></li>
          <li class="sop-step"><div class="step-num">2</div><div class="step-text"><strong>Record Payment:</strong> Click <strong>Log Payment</strong> on the invoice card. Enter payment mode (Cash, UPI, Net Banking) and amount paid.</div></li>
          <li class="sop-step"><div class="step-num">3</div><div class="step-text"><strong>Print Receipt:</strong> Status automatically updates to <code>PAID</code> or <code>PARTIAL</code>. Click <strong>Print PDF Receipt</strong> to issue to parent.</div></li>
        </ol>
      </div>
    </div>

    <div class="footer-bar">
      <span>CoachGenie ERP Enterprise Manual v1.0</span>
      <span>Page 6 of 7</span>
    </div>
  </div>

  <!-- PAGE 7: MODULES 11, 12, 13 & 14 -->
  <div class="pdf-page">
    <div>
      <div class="header-bar">
        <span>Modules 11, 12, 13 & 14: AI Copilot, Roles & Portals</span>
        <span>CoachGenie ERP Manual</span>
      </div>

      <!-- MODULE 11 & 12 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 11 & 12: AI Copilot & PDF Analytics Engine</span>
          <span class="badge-tag">INTELLIGENCE</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body">Routes: <code>/ai</code> & <code>/reports</code></div>
          </div>
          <div class="w3-box when">
            <div class="w3-header">⏰ WHEN TO USE</div>
            <div class="w3-body">Daily operational queries, generating weak student reports, revenue forecasting, and student AI assistance.</div>
          </div>
          <div class="w3-box why">
            <div class="w3-header">💡 WHY TO USE</div>
            <div class="w3-body">Uses pgvector RAG & Groq LLMs to answer complex queries and generate ready-to-print PDF insight reports.</div>
          </div>
        </div>
      </div>

      <!-- MODULE 13 & 14 -->
      <div class="module-card">
        <h1 class="section-title">
          <span>Module 13 & 14: Roles (RBAC) & Student/Parent Portals</span>
          <span class="badge-tag">SETTINGS & PORTALS</span>
        </h1>

        <div class="w3-grid">
          <div class="w3-box where">
            <div class="w3-header">📍 WHERE TO USE</div>
            <div class="w3-body"><code>/settings/users</code><br>Student App: <code>apps/student</code><br>Parent App: <code>apps/parent</code></div>
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
              <td><strong>Attendance & Exams</strong></td>
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
      </div>

      <div class="info-box tip">
        <strong>💡 Enterprise Support:</strong> For system administration inquiries, tenant provisioning, or custom domain mappings, refer to <code>COACHGENIE_USER_GUIDE.md</code> or contact institute support.
      </div>
    </div>

    <div class="footer-bar">
      <span>CoachGenie ERP Enterprise Manual v1.0</span>
      <span>Page 7 of 7</span>
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
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm'
    }
  });

  await browser.close();
  console.log(`SUCCESS! Perfect Page Fill User Manual PDF generated successfully at: ${pdfPath}`);
}

generatePDFManual().catch(err => {
  console.error("Error generating PDF Manual:", err);
  process.exit(1);
});
