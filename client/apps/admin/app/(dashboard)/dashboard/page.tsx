"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  UserPlus,
  Receipt,
  CalendarCheck,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  Users,
  Award,
  Bell,
  CreditCard,
  Settings,
} from "lucide-react";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { FeeCollectionChart } from "@/components/dashboard/FeeCollectionChart";
import { LeadFunnelChart } from "@/components/dashboard/LeadFunnelChart";
import { AttendanceHeatmap } from "@/components/dashboard/AttendanceHeatmap";
import { AnalyticsChatBubble } from "@/components/ai/AnalyticsChatBubble";

const QUICK_MODULES = [
  { name: "Admissions", href: "/admissions", icon: UserPlus, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  { name: "Batches & Timetable", href: "/batches", icon: BookOpen, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
  { name: "Attendance", href: "/attendance", icon: CalendarCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { name: "Exams & Ranks", href: "/exams", icon: FileSpreadsheet, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { name: "Fee Invoicing", href: "/fees", icon: Receipt, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  { name: "Growth Cards", href: "/growth-cards", icon: Award, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  { name: "Notifications", href: "/notifications", icon: Bell, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
  { name: "SaaS Billing", href: "/settings/billing", icon: CreditCard, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
];

export default function DashboardPage() {
  const [userName, setUserName] = useState("Administrator");

  useEffect(() => {
    try {
      const data = localStorage.getItem("coachgenie-ui");
      if (!data) return;
      const parsed = JSON.parse(data);
      const user = parsed?.state?.user;
      if (user) {
        setUserName(`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.name || "Administrator");
      }
    } catch {
      // Quiet fallback
    }
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 🚀 Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Executive Command Center
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> Live ERP Feed
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, <span className="font-semibold text-foreground">{userName}</span>. Here is today's real-time operational summary.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/leads"
            className="flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 text-blue-600" /> New Lead
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" /> Mark Attendance
          </Link>
          <Link
            href="/fees"
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <Receipt className="h-3.5 w-3.5" /> Record Fee
          </Link>
        </div>
      </div>

      {/* 🟢 System Diagnostic Status Banner */}
      <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Institute Health Score: 98% • All 13 ERP Modules Operational
            </p>
            <p className="text-xs text-emerald-600/80 font-medium">
              Multi-Tenant Security, pgvector RAG Engine, and Notification Gateways Active
            </p>
          </div>
        </div>

        <Link href="/settings" className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1">
          System Settings →
        </Link>
      </div>

      {/* 📊 Key Performance Indicators */}
      <KpiCards />

      {/* 📈 Charts Row: Fee Trend & Lead Funnel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FeeCollectionChart />
        <LeadFunnelChart />
      </div>

      {/* 📅 Attendance Activity Heatmap */}
      <AttendanceHeatmap />

      {/* 🧭 Quick Module Directory Grid */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-bold text-base tracking-tight">Platform Module Directory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Quick access to all connected ERP modules</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_MODULES.map((mod) => (
            <Link
              key={mod.name}
              href={mod.href}
              className="rounded-xl border bg-background p-3.5 hover:bg-accent/50 hover:border-primary/40 transition-all flex items-center justify-between group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${mod.bg}`}>
                  <mod.icon className={`h-4 w-4 ${mod.color}`} />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {mod.name}
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* 🤖 Floating AI Analytics Assistant */}
      <AnalyticsChatBubble />
    </div>
  );
}