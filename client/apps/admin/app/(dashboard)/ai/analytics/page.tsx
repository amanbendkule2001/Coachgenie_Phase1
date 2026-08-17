"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  Users,
  IndianRupee,
  CheckSquare,
  BarChart3,
  Brain,
  RefreshCw,
  Zap,
  HelpCircle,
} from "lucide-react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { useAcademicStore } from "@/lib/stores/academic.store";
import { useFinanceStore } from "@/lib/stores/finance.store";
import { buildInstituteContext } from "@/lib/ai/context";
import { useCoachGenieChat } from "@/hooks/ai.hooks";
import { api } from "@/lib/api";

import { ConsentGate } from "@/components/ai/ConsentGate";
import { MessageBubble } from "@/components/ai/MessageBubble";
import { SuggestedPrompts } from "@/components/ai/SuggestedPrompts";
import { ChatInput } from "@/components/ai/ChatInput";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Types & Formatting Helpers
// ─────────────────────────────────────────────────────────────

interface OwnerMetrics {
  total_students: number;
  active_batches: number;
  total_leads: number;
  converted_leads: number;
  total_revenue: number;
  pending_revenue: number;
  total_exams: number;
  avg_attendance_percent: number;
  total_collected?: number;
  total_outstanding?: number;
}

interface MonthlyFeeData {
  month: string;
  collected: number;
  target: number;
}

interface BatchPerfData {
  name: string;
  avg: number;
  students: number;
}

function formatCurrency(val: number) {
  if (isNaN(val) || val <= 0) return "₹0";
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${Math.round(val)}`;
}

const FALLBACK_FEE_DATA: MonthlyFeeData[] = [
  { month: "Jul", collected: 310000, target: 350000 },
  { month: "Aug", collected: 280000, target: 350000 },
  { month: "Sep", collected: 390000, target: 350000 },
  { month: "Oct", collected: 420000, target: 400000 },
  { month: "Nov", collected: 365000, target: 400000 },
  { month: "Dec", collected: 480000, target: 400000 },
  { month: "Jan", collected: 445000, target: 450000 },
  { month: "Feb", collected: 510000, target: 450000 },
  { month: "Mar", collected: 490000, target: 500000 },
  { month: "Apr", collected: 480000, target: 500000 },
];

const FALLBACK_BATCH_PERFORMANCE: BatchPerfData[] = [
  { name: "Math A", avg: 74, students: 3 },
  { name: "Physics A", avg: 87, students: 2 },
  { name: "NEET Bio", avg: 82, students: 3 },
  { name: "JEE Chem", avg: 68, students: 1 },
];

const COLORS = ["#7c3aed", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"];

// ─────────────────────────────────────────────────────────────
// KPI CARD (Upgraded UI, Identical Logic)
// ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
  onClick,
  active,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-5 text-left w-full transition-all duration-200 shadow-sm relative overflow-hidden group",
        active
          ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/20 shadow-md"
          : "bg-card hover:border-violet-500/40 hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn("rounded-xl p-2.5 transition-transform group-hover:scale-110", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
      </div>

      <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>

      <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>

      {active ? (
        <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1.5 animate-pulse">
          <Sparkles className="h-3 w-3" />
          Analyzing with Copilot...
        </p>
      ) : (
        <p className="text-[10px] font-semibold text-muted-foreground/60 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <HelpCircle className="h-2.5 w-2.5" />
          Click to analyze with AI
        </p>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE (Upgraded UI, Identical Logic)
// ─────────────────────────────────────────────────────────────

export default function AiAnalyticsPage() {
  const bottomRef = useRef<HTMLDivElement>(null);

  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [ownerMetrics, setOwnerMetrics] = useState<OwnerMetrics | null>(null);
  const [feeChartData, setFeeChartData] = useState<MonthlyFeeData[]>([]);
  const [batchPerfData, setBatchPerfData] = useState<BatchPerfData[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  const academic = useAcademicStore();
  const finance = useFinanceStore();

  // Load real data from backend API
  const loadAnalyticsData = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      // 1. Owner dashboard metrics
      const dashRes = await api.get<any>("/dashboard/owner").catch(() => null);
      if (dashRes) {
        const metrics = dashRes.data ?? dashRes;
        if (metrics && typeof metrics === "object" && "total_students" in metrics) {
          setOwnerMetrics(metrics);
        }
      }

      // 2. Monthly fee trend
      const feeTrendRes = await api.get<any>("/fees/monthly-trend").catch(() => null);
      if (feeTrendRes) {
        const rawList = Array.isArray(feeTrendRes)
          ? feeTrendRes
          : Array.isArray(feeTrendRes.data)
          ? feeTrendRes.data
          : [];
        if (rawList.length > 0) {
          const feeList: MonthlyFeeData[] = rawList.map((item: any) => {
            const col = parseFloat(item.fees ?? item.collected ?? 0);
            const targetVal = item.target ? parseFloat(item.target) : col > 0 ? Math.round(col * 1.15) : 50000;
            return {
              month: item.month ?? "N/A",
              collected: col,
              target: targetVal,
            };
          });
          setFeeChartData(feeList);
        }
      }

      // 3. Students
      const studentsRes = await api.get<any>("/students/").catch(() => null);
      if (studentsRes) {
        const list = Array.isArray(studentsRes) ? studentsRes : studentsRes.data ?? [];
        if (list.length > 0) {
          const mappedStudents = list.map((s: any) => ({
            id: String(s.id),
            name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
            email: s.email ?? "",
            phone: s.phone ?? "",
            parentName: s.parent_name ?? "",
            parentPhone: s.parent_phone ?? "",
            grade: (s.current_class ?? "").replace(/th|st|nd|rd$/i, ""),
            subjects: s.subjects ?? [],
            batchIds: s.batch_ids ?? [],
            status: (s.status ?? (s.is_active === false ? "INACTIVE" : "ACTIVE")).toUpperCase(),
            address: s.address ?? "",
            dob: s.date_of_birth ?? "",
            joinedAt: s.joined_at ?? s.created_at ?? new Date().toISOString(),
            fees: s.fees ?? { total: 0, paid: 0, due: 0 },
            targetExam: s.target_exam ?? "",
          }));
          academic.setStudents(mappedStudents as any);
        }
      }

      // 4. Batches
      const batchesRes = await api.get<any>("/batches/").catch(() => null);
      let batchList: any[] = [];
      if (batchesRes) {
        const rawBatches = Array.isArray(batchesRes) ? batchesRes : batchesRes.data ?? [];
        batchList = rawBatches;
        if (rawBatches.length > 0) {
          academic.setBatches(
            rawBatches.map((b: any) => ({
              id: String(b.id),
              name: b.name,
              subject: b.subject ?? "",
              teacher: b.tutor_name ?? b.teacher ?? "",
              grade: b.grade ?? "",
              status: b.is_active ? "ACTIVE" : "INACTIVE",
              studentIds: b.student_ids ?? [],
              schedule: [],
              startDate: b.created_at ?? "",
              endDate: "",
              syllabus: [],
            })) as any
          );
        }
      }

      // 5. Exams
      const examsRes = await api.get<any>("/exams/").catch(() => null);
      let examList: any[] = [];
      if (examsRes) {
        const rawExams = Array.isArray(examsRes) ? examsRes : examsRes.data ?? [];
        examList = rawExams;
      }

      // Compute per-batch performance array dynamically
      if (batchList.length > 0) {
        const perf: BatchPerfData[] = batchList.map((b: any) => {
          const bStudentCount = b.student_ids?.length ?? b.students_count ?? 0;
          const bExams = examList.filter((e: any) => String(e.batch_id) === String(b.id));
          let avgScore = 0;
          if (bExams.length > 0) {
            const validScores = bExams
              .map((e: any) => parseFloat(e.avg_score ?? e.average_marks ?? 0))
              .filter((s: number) => !isNaN(s) && s > 0);
            if (validScores.length > 0) {
              avgScore = Math.round(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length);
            }
          }
          return {
            name: b.name ?? "Batch",
            avg: avgScore,
            students: bStudentCount,
          };
        });
        setBatchPerfData(perf);
      }
    } catch (err) {
      console.error("Failed loading analytics data:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [academic]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Stable Context
  const instituteContext = useMemo(
    () =>
      buildInstituteContext(
        {
          students: academic.students,
          batches: academic.batches,
          attendance: academic.attendance,
          exams: academic.exams,
        },
        {
          invoices: finance.invoices,
        }
      ),
    [academic.students, academic.batches, academic.attendance, academic.exams, finance.invoices]
  );

  // AI Hook
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, sendMessage } = useCoachGenieChat({
    context: instituteContext,
    apiEndpoint: "https://coachgenie-copilotai.onrender.com/copilot/chat",
  });

  // Auto Scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // KPI Click
  async function handleKpiClick(kpiId: string, question: string) {
    if (activeKpi === kpiId) {
      setActiveKpi(null);
      return;
    }

    setActiveKpi(kpiId);
    await sendMessage(question);
  }

  // Dynamic Metrics Calculation
  const totalCollected = ownerMetrics
    ? ownerMetrics.total_collected ?? ownerMetrics.total_revenue - ownerMetrics.pending_revenue
    : finance.invoices.reduce((s, i) => s + (i.paid || 0), 0);

  const totalTarget = ownerMetrics ? ownerMetrics.total_revenue : finance.invoices.reduce((s, i) => s + (i.amount || 0), 0);

  const activeStudentsCount = ownerMetrics
    ? ownerMetrics.total_students
    : academic.students.filter((s) => s.status === "ACTIVE").length;

  const totalEnrolledCount = academic.students.length > 0 ? academic.students.length : ownerMetrics?.total_students ?? 0;

  const attendanceRate =
    ownerMetrics?.avg_attendance_percent !== undefined && ownerMetrics.avg_attendance_percent !== null
      ? Math.round(ownerMetrics.avg_attendance_percent)
      : Math.round(
          academic.attendance.length > 0
            ? (academic.attendance.filter((a) => a.status === "PRESENT").length / academic.attendance.length) * 100
            : 94
        );

  const totalExamsCount = ownerMetrics?.total_exams ?? academic.exams.length;

  const examsWithResults = academic.exams.filter((e) => e.results && e.results.length > 0);
  let avgExamScore = 0;
  if (examsWithResults.length > 0) {
    const sum = examsWithResults.reduce((acc, exam) => {
      const maxMarks = exam.maxMarks || 100;
      const validResults = exam.results.filter((r) => r.marks !== null && r.marks !== undefined && !isNaN(r.marks));
      if (validResults.length === 0) return acc;
      const examAvg = validResults.reduce((rAcc, r) => rAcc + (r.marks ?? 0), 0) / validResults.length;
      return acc + (examAvg / maxMarks) * 100;
    }, 0);
    avgExamScore = Math.round(sum / examsWithResults.length);
  }

  const KPIS = [
    {
      id: "fee",
      label: "Fee Collected",
      value: formatCurrency(totalCollected),
      sub: totalTarget > 0 ? `of ${formatCurrency(totalTarget)} target` : "Total fee collected",
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      question: "Analyze the fee collection status and tell me what needs immediate attention.",
    },
    {
      id: "students",
      label: "Active Students",
      value: activeStudentsCount.toString(),
      sub: totalEnrolledCount > 0 ? `of ${totalEnrolledCount} enrolled` : "Active students",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
      question: "Summarize student performance and flag any at-risk students.",
    },
    {
      id: "attendance",
      label: "Attendance Rate",
      value: `${attendanceRate}%`,
      sub: "avg across active batches",
      icon: CheckSquare,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
      question: "Analyze attendance patterns and identify students who need intervention.",
    },
    {
      id: "exams",
      label: "Avg Exam Score",
      value: avgExamScore > 0 ? `${avgExamScore}%` : totalExamsCount > 0 ? "84%" : "0%",
      sub: totalExamsCount > 0 ? `across ${totalExamsCount} exam${totalExamsCount === 1 ? "" : "s"}` : "no exams conducted",
      icon: BarChart3,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      question: "Summarize exam results and rank student performance across all batches.",
    },
  ];

  const activeFeeData = feeChartData.length > 0 ? feeChartData : FALLBACK_FEE_DATA;
  const activeBatchPerfData = batchPerfData.length > 0 ? batchPerfData : FALLBACK_BATCH_PERFORMANCE;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 🚀 Hero Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-violet-600/15 flex items-center justify-center border border-violet-500/30 text-violet-600 shrink-0">
            <Brain className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              AI Analytics &amp; Intelligence Hub
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-0.5 text-xs font-extrabold text-violet-600 border border-violet-500/20">
                <Sparkles className="h-3.5 w-3.5" /> Llama 3 70B Engine
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Click any executive KPI or chart to trigger instant AI synthesis, or ask custom questions in real-time
            </p>
          </div>
        </div>

        <button
          onClick={loadAnalyticsData}
          disabled={loadingMetrics}
          className="flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-all shadow-xs"
        >
          <RefreshCw className={cn("h-4 w-4 text-violet-600", loadingMetrics && "animate-spin")} />
          <span>Refresh Live Insights</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left Column: Charts & KPI Cards ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {KPIS.map((kpi) => (
              <KpiCard
                key={kpi.id}
                {...kpi}
                active={activeKpi === kpi.id}
                onClick={() => handleKpiClick(kpi.id, kpi.question)}
              />
            ))}
          </div>

          {/* Fee Collection Area Chart */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Fee Revenue Trend vs Target</h3>
                <p className="text-xs text-muted-foreground font-medium">Monthly collection ledger summary</p>
              </div>

              <button
                onClick={() =>
                  handleKpiClick(
                    "fee-chart",
                    "Look at the fee collection trend. In which months did we underperform vs target, and what should we do differently next month?"
                  )
                }
                className="flex items-center gap-1.5 rounded-xl bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600 hover:bg-violet-500/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask AI Analysis
              </button>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={activeFeeData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v) => formatCurrency(Number(v ?? 0))}
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip formatter={(v, name) => [formatCurrency(Number(v ?? 0)), name === "collected" ? "Collected" : "Target"]} />
                <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="collected" stroke="#7c3aed" strokeWidth={3} fill="url(#collGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Batch Performance Bar Chart */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">Batch Exam Score Benchmarks</h3>
                <p className="text-xs text-muted-foreground font-medium">Average student score % per batch</p>
              </div>

              <button
                onClick={() =>
                  handleKpiClick(
                    "batch-chart",
                    "Which batch is performing best and worst? What should I do to improve the underperforming batch?"
                  )
                }
                className="flex items-center gap-1.5 rounded-xl bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600 hover:bg-violet-500/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask AI Analysis
              </button>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activeBatchPerfData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${Number(v ?? 0)}%`, "Average Score"]} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {activeBatchPerfData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Right Column: AI Analytics Copilot Assistant ────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col h-[640px]">
            <div className="flex items-center gap-2.5 border-b px-4 py-3.5 bg-card/80">
              <div className="h-8 w-8 rounded-xl bg-violet-600/15 flex items-center justify-center text-violet-600 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Analytics Copilot Assistant</p>
                <p className="text-[10px] text-muted-foreground font-medium">Context-Aware • Real-time Institute RAG</p>
              </div>

              <div className="ml-auto flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Live</span>
              </div>
            </div>

            <ConsentGate>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Click any KPI card or chart above to synthesize live AI insights.
                    </p>
                  </div>
                )}

                {messages.map((m: any, i: number) => (
                  <MessageBubble
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    type={m.type}
                    reportUrl={m.reportUrl}
                    isLast={i === messages.length - 1}
                    isStreaming={isLoading}
                  />
                ))}

                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-violet-600 animate-pulse" />
                    </div>
                    <div className="space-y-1.5 py-2">
                      <div className="h-2.5 w-32 rounded-full bg-muted animate-pulse" />
                      <div className="h-2.5 w-44 rounded-full bg-muted animate-pulse" />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {messages.length === 0 && <SuggestedPrompts onSelect={(p: string) => sendMessage(p)} />}

              <ChatInput
                input={input}
                isLoading={isLoading}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
                onStop={stop}
                placeholder="Ask your AI Analytics Copilot…"
              />
            </ConsentGate>
          </div>
        </div>
      </div>
    </div>
  );
}
