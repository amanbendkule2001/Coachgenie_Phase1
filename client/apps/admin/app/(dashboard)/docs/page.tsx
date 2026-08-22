"use client";

import { useState } from "react";
import {
  BookOpen, Rocket, Users, FileCheck, UserPlus,
  Book, CheckSquare, ClipboardList, IndianRupee, Sparkles,
  HelpCircle, Code2, ExternalLink, Search, ChevronRight, ShieldCheck
} from "lucide-react";

export default function DocumentationPage() {
  const [activeTab, setActiveTab] = useState<"quickstart" | "modules" | "faqs" | "api">("quickstart");
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      q: "How do I sign in to my institute's portal?",
      a: "Navigate to /login, enter your Institute Subdomain (e.g. demo), your assigned email, and password. You will be redirected to your role-specific dashboard automatically."
    },
    {
      q: "What happens when my session expires?",
      a: "For security, access tokens expire after 15 minutes. If your session expires, you will be cleanly redirected to the login page with a notification to sign in again."
    },
    {
      q: "How do I convert a Sales Lead into an Admission?",
      a: "Go to /leads, click on any lead card, and click the 'Convert Lead' button. The lead's details will auto-populate into the Admission Form."
    },
    {
      q: "How do I record a student fee payment and print a receipt?",
      a: "Navigate to /fees, select the student invoice, click 'Record Payment', enter the amount (Cash/UPI), and click 'Generate PDF Receipt'."
    },
    {
      q: "How does tenant data isolation work?",
      a: "CoachGenie enforces logical row-level multi-tenancy. All database queries pass through an automated X-Tenant-Id header filter, ensuring zero data leakage between coaching institutes."
    }
  ];

  const filteredFaqs = faqs.filter(
    f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
         f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5" /> Documentation & Knowledge Hub
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              CoachGenie ERP User & Technical Documentation
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Complete operational guides for institute owners, sales counselors, tutors, and developers. Search guides or explore API endpoints.
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg transition-all"
            >
              <Code2 className="h-4 w-4" /> FastAPI Swagger Docs <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-muted p-1.5 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-1">
        <button
          onClick={() => setActiveTab("quickstart")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            activeTab === "quickstart" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Rocket className="h-4 w-4" /> Quickstart Guide
        </button>
        <button
          onClick={() => setActiveTab("modules")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            activeTab === "modules" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Book className="h-4 w-4" /> Core Modules
        </button>
        <button
          onClick={() => setActiveTab("faqs")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            activeTab === "faqs" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <HelpCircle className="h-4 w-4" /> FAQs & Support
        </button>
        <button
          onClick={() => setActiveTab("api")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            activeTab === "api" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code2 className="h-4 w-4" /> Developer API Docs
        </button>
      </div>

      {/* 1. QUICKSTART TAB */}
      {activeTab === "quickstart" && (
        <div className="border rounded-2xl p-6 bg-card space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Rocket className="h-5 w-5 text-indigo-600" /> 2-Minute Quickstart & Onboarding Guide
          </h2>
          <p className="text-sm text-muted-foreground">
            Follow these simple steps to start managing your coaching institute in minutes.
          </p>

          <div className="grid md:grid-cols-3 gap-4 pt-2">
            <div className="border rounded-xl p-4 bg-accent/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">1</span>
                Sign In to Your Subdomain
              </div>
              <p className="text-xs text-muted-foreground">
                Go to <code>/login</code>, enter your institute code (e.g. <code>demo</code>), email, and password to access your role dashboard.
              </p>
            </div>

            <div className="border rounded-xl p-4 bg-accent/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">2</span>
                Add Batches & Staff
              </div>
              <p className="text-xs text-muted-foreground">
                Navigate to <code>/batches</code> to create course schedules, and use <code>/settings</code> to invite tutors and counselors.
              </p>
            </div>

            <div className="border rounded-xl p-4 bg-accent/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">3</span>
                Track Leads & Collect Fees
              </div>
              <p className="text-xs text-muted-foreground">
                Manage prospective students on the Sales Kanban (<code>/leads</code>), approve admissions, and issue GST-ready fee receipts.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Demo Credentials Ready:</strong>
              Use Subdomain: <code>demo</code> | Owner: <code>owner@demo.com</code> | Counselor: <code>counselor@demo.com</code> | Password: <code>Admin@1234</code>
            </div>
          </div>
        </div>
      )}

      {/* 2. CORE MODULES TAB */}
      {activeTab === "modules" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-xl p-5 bg-card space-y-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-600" /> Sales CRM & Lead Kanban (`/leads`)
            </h3>
            <p className="text-xs text-muted-foreground">
              Track leads across 8 pipeline stages: <code>New ➔ Contacted ➔ Demo Scheduled ➔ Negotiation ➔ Enrolled</code>. Schedule follow-ups and convert leads directly into admission records.
            </p>
          </div>

          <div className="border rounded-xl p-5 bg-card space-y-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-600" /> Admissions & Student Roster (`/admissions`)
            </h3>
            <p className="text-xs text-muted-foreground">
              Review submitted application forms, verify documents, assign student batch rosters, and generate enrollment IDs automatically.
            </p>
          </div>

          <div className="border rounded-xl p-5 bg-card space-y-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-600" /> Attendance & Alerts (`/attendance`)
            </h3>
            <p className="text-xs text-muted-foreground">
              Mark daily batch attendance (Present, Absent, Late) with single-click actions. Low attendance notifications dispatch SMS/WhatsApp alerts.
            </p>
          </div>

          <div className="border rounded-xl p-5 bg-card space-y-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-rose-600" /> Fee Collection & PDF Receipts (`/fees`)
            </h3>
            <p className="text-xs text-muted-foreground">
              Issue course fee invoices with installment schedules. Record cash/UPI settlements and auto-generate printable PDF payment receipts.
            </p>
          </div>

          <div className="border rounded-xl p-5 bg-card space-y-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-600" /> Examinations & Report Cards (`/exams`)
            </h3>
            <p className="text-xs text-muted-foreground">
              Schedule mock tests, record student marks, auto-compute class ranks/percentiles, and print student performance report cards.
            </p>
          </div>

          <div className="border rounded-xl p-5 bg-card space-y-2">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> AI Learning Copilot (`/ai`)
            </h3>
            <p className="text-xs text-muted-foreground">
              Context-aware Groq LLaMA 3 assistant for instant student doubt clearing, automated study quiz creation, and personalized faculty remarks.
            </p>
          </div>
        </div>
      )}

      {/* 3. FAQS TAB */}
      {activeTab === "faqs" && (
        <div className="border rounded-2xl p-6 bg-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-600" /> Frequently Asked Questions & Troubleshooting
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border bg-background"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {filteredFaqs.map((faq, idx) => (
              <div key={idx} className="border rounded-xl p-4 space-y-1 bg-accent/20">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-indigo-600" /> {faq.q}
                </h3>
                <p className="text-xs text-muted-foreground pl-6">{faq.a}</p>
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No matching FAQs found.</p>
            )}
          </div>
        </div>
      )}

      {/* 4. DEVELOPER API TAB */}
      {activeTab === "api" && (
        <div className="border rounded-2xl p-6 bg-card space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-600" /> Developer & Integration API Reference
          </h2>
          <p className="text-xs text-muted-foreground">
            CoachGenie FastAPI backend automatically generates live interactive documentation and OpenAPI schemas.
          </p>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="border rounded-xl p-5 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 transition-all flex items-start gap-4"
            >
              <div className="p-3 bg-indigo-600 text-white rounded-lg">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-1">
                  Swagger UI Interactive Docs <ExternalLink className="h-3 w-3" />
                </h3>
                <p className="text-xs text-indigo-800 mt-1">
                  Test API endpoints live in your browser at <code>http://localhost:8000/docs</code>.
                </p>
              </div>
            </a>

            <a
              href="http://localhost:8000/redoc"
              target="_blank"
              rel="noopener noreferrer"
              className="border rounded-xl p-5 bg-slate-50 hover:bg-slate-100 border-slate-200 transition-all flex items-start gap-4"
            >
              <div className="p-3 bg-slate-800 text-white rounded-lg">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1">
                  ReDoc API Specification <ExternalLink className="h-3 w-3" />
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Clean, structured technical API reference at <code>http://localhost:8000/redoc</code>.
                </p>
              </div>
            </a>
          </div>

          <div className="bg-slate-950 text-slate-200 p-4 rounded-xl space-y-2 text-xs font-mono">
            <div className="text-indigo-400 font-bold"># Required API Proxy Request Headers:</div>
            <div>Authorization: Bearer &lt;access_token&gt;</div>
            <div>X-Tenant-Id: &lt;tenant_uuid&gt;</div>
            <div>Content-Type: application/json</div>
          </div>
        </div>
      )}
    </div>
  );
}
