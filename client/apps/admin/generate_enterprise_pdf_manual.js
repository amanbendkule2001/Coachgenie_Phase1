const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CoachGenie ERP - Enterprise User Manual</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.6;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 20mm 20mm 20mm 20mm;
      position: relative;
      background: #ffffff;
      page-break-after: always;
      overflow: hidden;
    }

    /* Cover Page Styling */
    .cover-page {
      padding: 0;
      display: flex;
      background: #ffffff;
    }

    .cover-left-bar {
      width: 32%;
      height: 100%;
      background: linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6366f1 100%);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 40px 24px;
      color: #ffffff;
    }

    .cover-left-graphic {
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      margin-top: 60px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }

    .cover-left-footer {
      font-size: 10px;
      color: #c7d2fe;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 16px;
    }

    .cover-right-content {
      width: 68%;
      height: 100%;
      padding: 60px 40px 40px 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .cover-header-meta {
      text-align: right;
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .cover-main-title {
      font-size: 32px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .cover-subtitle {
      font-size: 18px;
      color: #4f46e5;
      font-weight: 600;
      margin-bottom: 24px;
    }

    .cover-desc {
      font-size: 13px;
      color: #475569;
      line-height: 1.7;
    }

    .cover-footer-logos {
      display: flex;
      align-items: center;
      gap: 20px;
      border-top: 2px solid #f1f5f9;
      padding-top: 24px;
    }

    .logo-badge {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Page Header & Footer */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 20px;
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }

    .page-footer {
      position: absolute;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      font-size: 9px;
      color: #94a3b8;
    }

    /* Typography & Headers */
    h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 16px 0;
      letter-spacing: -0.01em;
    }

    h2 {
      font-size: 15px;
      font-weight: 700;
      color: #3730a3;
      margin: 16px 0 10px 0;
    }

    p {
      margin: 0 0 12px 0;
      color: #334155;
    }

    /* UI Diagram / Callout Mockup Boxes */
    .ui-mockup-container {
      background: #f8fafc;
      border: 2px solid #cbd5e1;
      border-radius: 10px;
      padding: 16px;
      margin: 16px 0;
      position: relative;
    }

    .ui-mockup-header {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 6px 6px 0 0;
      font-weight: 700;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -16px -16px 14px -16px;
    }

    .ui-callout-box {
      border: 2px solid #ef4444;
      background: rgba(239, 68, 68, 0.05);
      border-radius: 6px;
      padding: 8px 12px;
      position: relative;
      margin-bottom: 12px;
    }

    .ui-callout-box.blue {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
    }

    .ui-callout-box.green {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }

    .callout-arrow-label {
      position: absolute;
      top: -12px;
      right: 12px;
      background: #ef4444;
      color: #ffffff;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .callout-arrow-label.blue { background: #3b82f6; }
    .callout-arrow-label.green { background: #10b981; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11px;
    }

    th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      font-size: 10px;
      text-transform: uppercase;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Notice Warning Box */
    .notice-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 11px;
      color: #92400e;
    }

    .notice-box.danger {
      background: #fef2f2;
      border-color: #fee2e2;
      border-left-color: #ef4444;
      color: #991b1b;
    }

    /* Icon Reference Grid */
    .icon-ref-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .icon-ref-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-symbol {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      color: #ffffff;
    }

    .icon-symbol.blue { background: #3b82f6; }
    .icon-symbol.green { background: #10b981; }
    .icon-symbol.purple { background: #8b5cf6; }
    .icon-symbol.red { background: #ef4444; }

    code {
      font-family: 'Consolas', monospace;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10.5px;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: COVER PAGE -->
  <div class="page cover-page">
    <div class="cover-left-bar">
      <div>
        <div style="font-weight: 800; font-size: 18px; letter-spacing: 0.05em;">COACHGENIE</div>
        <div style="font-size: 11px; color: #c7d2fe;">ERP SOFTWARE</div>
        <div class="cover-left-graphic">🚀</div>
      </div>
      <div class="cover-left-footer">
        <strong>Document Version:</strong> 1.0<br>
        <strong>Release Date:</strong> May 2026<br>
        <strong>Classification:</strong> Official Manual
      </div>
    </div>
    
    <div class="cover-right-content">
      <div class="cover-header-meta">COACHGENIE ERP OPERATIONAL MANUAL</div>
      
      <div>
        <div class="cover-main-title">CoachGenie Multi-Tenant ERP</div>
        <div class="cover-subtitle">Web Application Enterprise User Manual</div>
        <div class="cover-desc">
          A comprehensive step-by-step operational manual for Institute Owners, Sales Counselors, Tutors, Students, and Parents. Covers system authentication, lead pipeline management, class scheduling, attendance logging, fee invoicing, and AI Copilot assistance.
        </div>
      </div>

      <div>
        <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 10px; text-transform: uppercase;">Verified Operational Modules</div>
        <div class="cover-footer-logos">
          <div class="logo-badge">🎓 Student ERP</div>
          <div class="logo-badge">🎯 Sales Kanban</div>
          <div class="logo-badge">💰 Fee Billing</div>
          <div class="logo-badge">🤖 AI Copilot</div>
        </div>
      </div>
    </div>
  </div>

  <!-- PAGE 2: MODULE OVERVIEW & SECURITY POLICY -->
  <div class="page">
    <div class="page-header">
      <span>COACHGENIE ERP &bull; ENTERPRISE USER MANUAL</span>
      <span>PAGE 2</span>
    </div>

    <h1>1. System Overview & Security Policy</h1>
    
    <h2>1.1 CoachGenie Web Application Modules</h2>
    <p>CoachGenie provides centralized, role-based management across all operations of a coaching institute:</p>

    <table>
      <thead>
        <tr>
          <th>Module Name</th>
          <th>Primary Functions & Key Capabilities</th>
          <th>Target User Roles</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Multi-Tenant Auth</strong></td>
          <td>Subdomain-isolated login environments with HTTP-only session cookies</td>
          <td>All Users</td>
        </tr>
        <tr>
          <td><strong>Sales Pipeline Kanban</strong></td>
          <td>8-stage lead tracking, counselor assignment, activities & conversion</td>
          <td>Owners, Counselors</td>
        </tr>
        <tr>
          <td><strong>Student & Admissions</strong></td>
          <td>Admission verification, enrollment numbering, profile directory</td>
          <td>Owners, Counselors</td>
        </tr>
        <tr>
          <td><strong>Batches & Classes</strong></td>
          <td>Batch allocation, daily class scheduling & tutor assignments</td>
          <td>Owners, Tutors</td>
        </tr>
        <tr>
          <td><strong>Syllabus Tracker</strong></td>
          <td>Topic-level progress tracking (Not Started, In Progress, Completed)</td>
          <td>Tutors, Students</td>
        </tr>
        <tr>
          <td><strong>Attendance & Exams</strong></td>
          <td>Daily attendance logging, exam creation & student mark entries</td>
          <td>Tutors, Students</td>
        </tr>
        <tr>
          <td><strong>Fee Invoices & Billing</strong></td>
          <td>Fee templates, installment tracking, cash/UPI logs & overdue alerts</td>
          <td>Owners, Parents</td>
        </tr>
        <tr>
          <td><strong>AI Copilot Assistant</strong></td>
          <td>Intelligent student learning assistance & performance reports</td>
          <td>All Users</td>
        </tr>
      </tbody>
    </table>

    <h2>1.2 Security Policy & Data Isolation Notice</h2>
    <div class="notice-box danger">
      <strong>SECURITY POLICY COMPLIANCE:</strong><br>
      CoachGenie enforces strict multi-tenant database row-level locking. Each coaching institute operates within its own isolated subdomain (e.g. <code>demo</code>). Users are strictly prohibited from sharing login credentials or attempting cross-tenant URL manipulation.
    </div>

    <div class="ui-mockup-container">
      <div class="ui-mockup-header">
        <span>⚠️ MANDATORY SECURITY REQUIREMENT</span>
        <span>SECURITY NOTICE</span>
      </div>
      <p style="margin: 0;"><strong>Immediate Action Required If:</strong></p>
      <ul style="margin: 6px 0 0 0; padding-left: 20px;">
        <li>You lose or forget your account password.</li>
        <li>You undergo a change of role or responsibility within the institute.</li>
        <li>You leave or transfer to a different branch.</li>
      </ul>
    </div>

    <div class="page-footer">
      <span>CoachGenie ERP &bull; System Overview & Security</span>
      <span>Page 2</span>
    </div>
  </div>

  <!-- PAGE 3: ACCESS & AUTHENTICATION GUIDE -->
  <div class="page">
    <div class="page-header">
      <span>COACHGENIE ERP &bull; ENTERPRISE USER MANUAL</span>
      <span>PAGE 3</span>
    </div>

    <h1>2. How to Access & Log Into CoachGenie</h1>
    <p>Follow these step-by-step instructions to access your institute's dedicated environment.</p>

    <h2>2.1 Subdomain Authentication Flow</h2>
    
    <div class="ui-mockup-container">
      <div class="ui-mockup-header">
        <span>🌐 Step 1: Access Login Page (http://localhost:3000/login)</span>
        <span>LOGIN MOCKUP</span>
      </div>

      <div class="ui-callout-box blue">
        <span class="callout-arrow-label blue">1. Subdomain Input</span>
        <div style="font-weight: 700; margin-bottom: 2px;">Institute Subdomain:</div>
        <code>demo</code> <span style="color: #64748b;">(Required: Specifies Institute Tenant)</span>
      </div>

      <div class="ui-callout-box green">
        <span class="callout-arrow-label green">2. User Credentials</span>
        <div style="font-weight: 700; margin-bottom: 2px;">Email & Password:</div>
        <code>owner@demo.com</code> | <code>Admin@1234</code>
      </div>

      <div class="ui-callout-box">
        <span class="callout-arrow-label">3. Action Button</span>
        <div style="text-align: center; padding: 4px;">
          <span style="background: #3730a3; color: #fff; padding: 6px 20px; border-radius: 6px; font-weight: 700;">SIGN IN TO DASHBOARD</span>
        </div>
      </div>
    </div>

    <h2>2.2 Quick Role Demo Credentials Reference</h2>
    <table>
      <thead>
        <tr>
          <th>User Role</th>
          <th>Subdomain</th>
          <th>Demo Email Address</th>
          <th>Password</th>
          <th>Landing Route</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Institute Owner</strong></td>
          <td><code>demo</code></td>
          <td><code>owner@demo.com</code></td>
          <td><code>Admin@1234</code></td>
          <td><code>/dashboard</code></td>
        </tr>
        <tr>
          <td><strong>Sales Counselor</strong></td>
          <td><code>demo</code></td>
          <td><code>counselor@demo.com</code></td>
          <td><code>Admin@1234</code></td>
          <td><code>/leads</code></td>
        </tr>
        <tr>
          <td><strong>Tutor / Educator</strong></td>
          <td><code>demo</code></td>
          <td><code>tutor@demo.com</code></td>
          <td><code>Admin@1234</code></td>
          <td><code>/batches</code></td>
        </tr>
        <tr>
          <td><strong>Student</strong></td>
          <td><code>demo</code></td>
          <td><code>student@demo.com</code></td>
          <td><code>Admin@1234</code></td>
          <td><code>/student-portal</code></td>
        </tr>
      </tbody>
    </table>

    <div class="page-footer">
      <span>CoachGenie ERP &bull; Authentication Guide</span>
      <span>Page 3</span>
    </div>
  </div>

  <!-- PAGE 4: UI NAVIGATION & ICON LEGEND -->
  <div class="page">
    <div class="page-header">
      <span>COACHGENIE ERP &bull; ENTERPRISE USER MANUAL</span>
      <span>PAGE 4</span>
    </div>

    <h1>3. User Interface Controls & Icon Reference</h1>
    <p>CoachGenie uses a standardized set of interactive visual elements across all modules.</p>

    <h2>3.1 Icon & Action Reference Table</h2>
    
    <div class="icon-ref-grid">
      <div class="icon-ref-card">
        <div class="icon-symbol blue">+</div>
        <div>
          <div style="font-weight: 700;">Add New Record</div>
          <div style="font-size: 10px; color: #64748b;">Creates a new lead, student, invoice, or class.</div>
        </div>
      </div>

      <div class="icon-ref-card">
        <div class="icon-symbol green">👁</div>
        <div>
          <div style="font-weight: 700;">View Details</div>
          <div style="font-size: 10px; color: #64748b;">Opens detailed record inspection drawer.</div>
        </div>
      </div>

      <div class="icon-ref-card">
        <div class="icon-symbol purple">✏️</div>
        <div>
          <div style="font-weight: 700;">Edit / Update</div>
          <div style="font-size: 10px; color: #64748b;">Modifies existing fields or status stages.</div>
        </div>
      </div>

      <div class="icon-ref-card">
        <div class="icon-symbol red">🗑</div>
        <div>
          <div style="font-weight: 700;">Delete Record</div>
          <div style="font-size: 10px; color: #64748b;">Removes entry (Owner permission required).</div>
        </div>
      </div>
    </div>

    <h2>3.2 Navigation Bar Controls</h2>
    <div class="ui-mockup-container">
      <div class="ui-mockup-header">
        <span>📌 MAIN NAVIGATION TOOLBAR</span>
        <span>NAV MOCKUP</span>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <span style="background: #3730a3; color: #fff; padding: 6px 12px; border-radius: 4px; font-weight: 700;">Dashboard</span>
        <span style="background: #e2e8f0; color: #334155; padding: 6px 12px; border-radius: 4px; font-weight: 600;">Leads Kanban</span>
        <span style="background: #e2e8f0; color: #334155; padding: 6px 12px; border-radius: 4px; font-weight: 600;">Admissions</span>
        <span style="background: #e2e8f0; color: #334155; padding: 6px 12px; border-radius: 4px; font-weight: 600;">Students</span>
        <span style="background: #e2e8f0; color: #334155; padding: 6px 12px; border-radius: 4px; font-weight: 600;">Batches</span>
        <span style="background: #e2e8f0; color: #334155; padding: 6px 12px; border-radius: 4px; font-weight: 600;">Fee Invoices</span>
        <span style="background: #4f46e5; color: #fff; padding: 6px 12px; border-radius: 4px; font-weight: 700;">🤖 AI Copilot</span>
      </div>
    </div>

    <div class="page-footer">
      <span>CoachGenie ERP &bull; UI Controls & Icons</span>
      <span>Page 4</span>
    </div>
  </div>

  <!-- PAGE 5: OWNER & ADMIN OPERATIONS -->
  <div class="page">
    <div class="page-header">
      <span>COACHGENIE ERP &bull; ENTERPRISE USER MANUAL</span>
      <span>PAGE 5</span>
    </div>

    <h1>4. Institute Owner & Administrator Guide</h1>
    
    <h2>4.1 Executive Dashboard & Revenue Oversight</h2>
    <p>The Owner Dashboard (<code>/dashboard</code>) provides real-time financial and operational intelligence.</p>

    <div class="ui-mockup-container">
      <div class="ui-mockup-header">
        <span>📊 OWNER EXECUTIVE DASHBOARD</span>
        <span>REAL-TIME METRICS</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        <div style="background: #fff; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">TOTAL REVENUE</div>
          <div style="font-size: 16px; font-weight: 800; color: #166534;">₹12,45,000</div>
        </div>
        <div style="background: #fff; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">ACTIVE STUDENTS</div>
          <div style="font-size: 16px; font-weight: 800; color: #3730a3;">450 Students</div>
        </div>
        <div style="background: #fff; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
          <div style="font-size: 9px; color: #64748b; font-weight: 700;">PENDING DUES</div>
          <div style="font-size: 16px; font-weight: 800; color: #991b1b;">₹1,80,000</div>
        </div>
      </div>
    </div>

    <h2>4.2 Issuing Fee Invoices & Recording Payments</h2>
    <ul style="padding-left: 20px;">
      <li><strong>Step 1</strong>: Navigate to <code>/fees</code> and click <strong>+ Create Invoice</strong>.</li>
      <li><strong>Step 2</strong>: Select Student, Fee Structure template, set Due Date and Discount.</li>
      <li><strong>Step 3</strong>: To log payments, click <strong>Record Payment</strong>, enter amount (e.g. ₹5,000), payment mode (Cash/UPI), and reference transaction number.</li>
    </ul>

    <div class="page-footer">
      <span>CoachGenie ERP &bull; Owner Guide</span>
      <span>Page 5</span>
    </div>
  </div>

  <!-- PAGE 6: COUNSELOR & SALES PIPELINE -->
  <div class="page">
    <div class="page-header">
      <span>COACHGENIE ERP &bull; ENTERPRISE USER MANUAL</span>
      <span>PAGE 6</span>
    </div>

    <h1>5. Sales Counselor Guide (Leads & Pipeline)</h1>

    <h2>5.1 Sales Pipeline Kanban Stages (8 Stages)</h2>
    <div class="ui-mockup-container">
      <div class="ui-mockup-header">
        <span>🎯 SALES PIPELINE KANBAN BOARD</span>
        <span>8 STAGES</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; font-size: 10px; font-weight: 700;">
        <div style="background: #e2e8f0; padding: 6px; border-radius: 4px;">1. New</div>
        <div style="background: #e0e7ff; padding: 6px; border-radius: 4px; color: #3730a3;">2. Contacted</div>
        <div style="background: #dbeafe; padding: 6px; border-radius: 4px; color: #1e40af;">3. Interested</div>
        <div style="background: #fef3c7; padding: 6px; border-radius: 4px; color: #92400e;">4. Demo Sched.</div>
        <div style="background: #fed7aa; padding: 6px; border-radius: 4px; color: #9a3412;">5. Demo Done</div>
        <div style="background: #fbcfe8; padding: 6px; border-radius: 4px; color: #9d174d;">6. Negotiation</div>
        <div style="background: #dcfce7; padding: 6px; border-radius: 4px; color: #166534;">7. Enrolled</div>
        <div style="background: #fee2e2; padding: 6px; border-radius: 4px; color: #991b1b;">8. Lost</div>
      </div>
    </div>

    <h2>5.2 Converting Lead to Student Admission</h2>
    <p>When a lead is ready to enroll, click <strong>Convert Lead</strong>. CoachGenie automatically creates an Admission record and pre-fills all student contact details.</p>

    <div class="page-footer">
      <span>CoachGenie ERP &bull; Counselor Guide</span>
      <span>Page 6</span>
    </div>
  </div>

  <!-- PAGE 7: TUTOR GUIDE (BATCHES, ATTENDANCE & EXAMS) -->
  <div class="page">
    <div class="page-header">
      <span>COACHGENIE ERP &bull; ENTERPRISE USER MANUAL</span>
      <span>PAGE 7</span>
    </div>

    <h1>6. Tutor & Educator Operational Guide</h1>

    <h2>6.1 Daily Attendance & Syllabus Tracking</h2>
    <ul style="padding-left: 20px;">
      <li><strong>Class Attendance (<code>/attendance</code>)</strong>: Select batch date and toggle student status between <code>Present</code>, <code>Absent</code>, or <code>Late</code>.</li>
      <li><strong>Syllabus Progress (<code>/syllabus</code>)</strong>: Mark topics as completed. Completion percentages update automatically on the batch card.</li>
      <li><strong>Exams & Student Marks (<code>/exams</code>)</strong>: Enter student score marks for periodic unit tests.</li>
    </ul>

    <div class="page-footer">
      <span>CoachGenie ERP &bull; Tutor Guide</span>
      <span>Page 7</span>
    </div>
  </div>

  <!-- PAGE 8: HELPDESK & SUPPORT -->
  <div class="page">
    <div class="page-header">
      <span>COACHGENIE ERP &bull; ENTERPRISE USER MANUAL</span>
      <span>PAGE 8</span>
    </div>

    <h1>7. Helpdesk Support & Troubleshooting</h1>

    <h2>7.1 Common Troubleshooting Steps</h2>
    <table>
      <thead>
        <tr>
          <th>Issue Description</th>
          <th>Probable Cause</th>
          <th>Recommended Solution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Invalid Subdomain Error</td>
          <td>Subdomain field blank or misspelled</td>
          <td>Ensure <code>demo</code> or your registered subdomain is typed correctly.</td>
        </tr>
        <tr>
          <td>Session Timeout</td>
          <td>Idle for over 15 minutes</td>
          <td>Refresh browser page and log back in.</td>
        </tr>
        <tr>
          <td>Access Denied (403)</td>
          <td>Role lacks module permission</td>
          <td>Contact your Institute Owner to upgrade your account role.</td>
        </tr>
      </tbody>
    </table>

    <h2>7.2 Technical Support Personnel Contact</h2>
    <div class="ui-mockup-container">
      <div class="ui-mockup-header">
        <span>📞 HELPDESK & SUPPORT CONTACTS</span>
        <span>SUPPORT PERSONNEL</span>
      </div>
      <p style="margin: 0 0 6px 0;"><strong>System Administrator:</strong> Admin Engineering Team</p>
      <p style="margin: 0 0 6px 0;"><strong>Email Support:</strong> <code>support@thecoachgenie.in</code></p>
      <p style="margin: 0;"><strong>Web Portal:</strong> <code>https://thecoachgenie.in</code></p>
    </div>

    <div class="page-footer">
      <span>CoachGenie ERP &bull; Helpdesk & Support</span>
      <span>Page 8</span>
    </div>
  </div>

</body>
</html>`;

async function generatePDF() {
  const htmlPath = path.join(__dirname, '../../COACHGENIE_ENTERPRISE_USER_MANUAL.html');
  const pdfPath = path.join(__dirname, '../../CoachGenie_ERP_Enterprise_User_Manual.pdf');

  // Write HTML file
  fs.writeFileSync(htmlPath, htmlContent);
  console.log('Generated Enterprise User Manual HTML at:', htmlPath);

  // Launch Playwright and render PDF
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0mm',
      bottom: '0mm',
      left: '0mm',
      right: '0mm'
    }
  });

  await browser.close();
  console.log('Successfully generated Enterprise User Manual PDF at:', pdfPath);
}

generatePDF().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
