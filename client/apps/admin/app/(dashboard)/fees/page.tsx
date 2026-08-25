"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  IndianRupee,
  TrendingUp,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  FileSpreadsheet,
  Layers,
  Filter,
  Download,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/lib/auth-headers";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";

// ── API helpers ────────────────────────────────────────────────
const API = "/api/proxy";

// ── Types ──────────────────────────────────────────────────────
type Status = "paid" | "pending" | "overdue" | "partial";

interface RawInvoice {
  id: string;
  invoice_no: string;
  student_id: string;
  amount_due: string | number;
  amount_paid: string | number;
  discount: string | number;
  due_date: string;
  status: Status;
  created_at: string;
  student_name?: string;
  student?: { first_name?: string; last_name?: string; current_class?: string };
  payment_installment_schedule?: string | null;
  payments?: any[];
}

interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  studentName: string;
  grade: string;
  parentName?: string;
  phone?: string;
  email?: string;
  batchName?: string;
  boardName?: string;
  amountDue: number;
  amountPaid: number;
  discount: number;
  dueDate: string;
  createdAt: string;
  status: Status;
  installmentMonths: string[];
  installmentSchedule: Array<{ number: number; amount: number; dueDate: string; paid: boolean }>;
  payment_installment_schedule?: string | null;
  payments?: any[];
}

interface Summary {
  total_collected?: number;
  total_outstanding?: number;
  total_invoices?: number;
  overdue_count?: number;
}

function resolveInstallments(
  totalDue: number,
  totalPaid: number,
  invoiceDueDate: string,
  paymentInstallmentSchedule?: string | object | null,
  paymentsList: any[] = []
) {
  // ── 1. Parse stored installment schedule ───────────────────────────────
  let rawSlots: any[] = [];

  if (paymentInstallmentSchedule) {
    try {
      const sched =
        typeof paymentInstallmentSchedule === "string"
          ? JSON.parse(paymentInstallmentSchedule)
          : paymentInstallmentSchedule;

      if (Array.isArray(sched?.installmentSchedule) && sched.installmentSchedule.length > 0) {
        rawSlots = sched.installmentSchedule.map((s: any) => ({ ...s }));
      }
    } catch { /* ignore */ }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── 2. Stored schedule — use paid flags as-is, keep scheduled amounts ──
  if (rawSlots.length > 0) {
    const scheduledTotal = rawSlots.reduce((a: number, s: any) => a + (parseFloat(s.amount) || 0), 0);
    const paidSlotsTotal = rawSlots
      .filter((s: any) => Boolean(s.paid))
      .reduce((a: number, s: any) => a + (parseFloat(s.amount) || 0), 0);

    const remainingForUnpaid = Math.max(0, scheduledTotal - paidSlotsTotal);
    const unpaidCount = rawSlots.filter((s: any) => !Boolean(s.paid)).length;
    const baseUnpaid = unpaidCount > 0 ? Math.floor(remainingForUnpaid / unpaidCount) : 0;
    const extraUnpaid = unpaidCount > 0 ? remainingForUnpaid - baseUnpaid * unpaidCount : 0;

    let uIdx = 0;
    const finalSlots = rawSlots.map((s: any) => {
      if (!Boolean(s.paid)) {
        const amt = uIdx === 0 ? baseUnpaid + extraUnpaid : baseUnpaid;
        uIdx++;
        return { ...s, amount: amt, paid: false };
      }
      return { ...s, amount: parseFloat(s.amount) || 0, paid: true };
    });

    return finalSlots.map((s: any, idx: number) => {
      const instAmount = parseFloat(s.amount) || 0;
      const isPaid = Boolean(s.paid);
      const dStr = s.dueDate ?? s.due_date ?? invoiceDueDate ?? "";
      const dParsed = parseISO(dStr);
      const isOverdue = !isPaid && isValid(dParsed) && dParsed < today;
      const statusKey = isPaid ? "paid" : isOverdue ? "overdue" : "due";
      return {
        label: `Installment ${s.number ?? idx + 1}`,
        number: s.number ?? idx + 1,
        amount: instAmount,
        dueDate: dStr,
        status: statusKey.toUpperCase(),
        paidAmount: isPaid ? instAmount : 0,
      };
    });
  }

  // ── 3. No stored schedule — build slots from payment history ──────────────
  const sortedPayments = [...paymentsList].sort(
    (a: any, b: any) => new Date(a.paid_at || a.created_at || 0).getTime() - new Date(b.paid_at || b.created_at || 0).getTime()
  );

  if (sortedPayments.length > 0) {
    const paidTotal = sortedPayments.reduce((a: number, p: any) => a + (parseFloat(p.amount) || 0), 0);
    const remainingAfterPayments = Math.max(0, totalDue - paidTotal);

    const slots: any[] = sortedPayments.map((p: any, idx: number) => {
      const amt = parseFloat(p.amount) || 0;
      const dateStr = (p.paid_at || p.created_at || invoiceDueDate || format(new Date(), "yyyy-MM-dd")).substring(0, 10);
      return {
        label: `Installment ${idx + 1}`,
        number: idx + 1,
        amount: amt,
        dueDate: dateStr,
        status: "PAID",
        paidAmount: amt,
      };
    });

    if (remainingAfterPayments > 0) {
      const nextDue = new Date(invoiceDueDate || new Date());
      nextDue.setMonth(nextDue.getMonth() + sortedPayments.length);
      const isOverdue = nextDue < today;
      slots.push({
        label: `Installment ${sortedPayments.length + 1}`,
        number: sortedPayments.length + 1,
        amount: remainingAfterPayments,
        dueDate: format(nextDue, "yyyy-MM-dd"),
        status: isOverdue ? "OVERDUE" : "DUE",
        paidAmount: 0,
      });
    }
    return slots;
  }

  // ── 4. No payments, no schedule — single slot from totalDue/totalPaid ──────────────
  const dStr = invoiceDueDate || format(new Date(), "yyyy-MM-dd");
  const dParsed = parseISO(dStr);
  const isPaid = totalPaid >= totalDue && totalDue > 0;
  const isOverdue = !isPaid && isValid(dParsed) && dParsed < today;
  return [{
    label: "Installment 1",
    number: 1,
    amount: totalDue,
    dueDate: dStr,
    status: isPaid ? "PAID" : isOverdue ? "OVERDUE" : "DUE",
    paidAmount: Math.min(totalPaid, totalDue),
  }];
}

function mapInvoice(r: RawInvoice): Invoice {
  const firstName = r.student?.first_name ?? "";
  const lastName = r.student?.last_name ?? "";
  const name = r.student_name ?? (`${firstName} ${lastName}`.trim() || "—");

  let installmentSchedule: Array<{ number: number; amount: number; dueDate: string; paid: boolean }> = [];
  let installmentMonths: string[] = [];

  if (r.payment_installment_schedule) {
    try {
      const sched =
        typeof r.payment_installment_schedule === "string"
          ? JSON.parse(r.payment_installment_schedule)
          : r.payment_installment_schedule;
      const slots = sched?.installmentSchedule ?? [];
      installmentSchedule = slots.map((s: any) => ({
        number: s.number ?? 0,
        amount: parseFloat(s.amount) || 0,
        dueDate: s.dueDate ?? s.due_date ?? "",
        paid: s.paid ?? false,
      }));
      installmentMonths = installmentSchedule
        .map((s) => s.dueDate?.slice(0, 7))
        .filter(Boolean) as string[];
    } catch {}
  }

  if (installmentMonths.length === 0 && r.due_date) {
    installmentMonths = [r.due_date.slice(0, 7)];
  }

  return {
    id: r.id,
    invoiceNo: r.invoice_no,
    studentId: String(r.student_id),
    studentName: name,
    grade: r.student?.current_class ?? "",
    parentName: (r.student as any)?.parent_name ?? (r as any).parent_name ?? "Parent / Guardian",
    phone: (r.student as any)?.phone ?? (r as any).phone ?? "",
    email: (r.student as any)?.email ?? (r as any).email ?? "",
    batchName: (r.student as any)?.target_exam ?? (r.student as any)?.batch_name ?? (r as any).batch_name ?? "Standard Academic Batch",
    boardName: (r.student as any)?.board_name ?? "CBSE",
    amountDue: parseFloat(String(r.amount_due)) || 0,
    amountPaid: parseFloat(String(r.amount_paid)) || 0,
    discount: parseFloat(String(r.discount)) || 0,
    dueDate: r.due_date,
    createdAt: r.created_at,
    status: (r.status ? String(r.status).toLowerCase() : "pending") as Status,
    installmentMonths,
    installmentSchedule,
    payment_installment_schedule: r.payment_installment_schedule,
    payments: r.payments ?? [],
  };
}

// ── Status config ──────────────────────────────────────────────
const STATUS_CFG: Record<Status, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  overdue: { label: "Overdue", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  partial: { label: "Partial", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
};

// ── Month options ──────────────────────────────────────────────
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();

const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const date = new Date(currentYear, currentMonth - 6 + i);
  const y = date.getFullYear();
  const m = date.getMonth();
  return {
    label: `${MONTHS[m]} ${y}`,
    value: `${y}-${String(m + 1).padStart(2, "0")}`,
  };
}).reverse();

export default function FeesPage() {
  const [viewTab, setViewTab] = useState<"invoices" | "installments">("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [monthFilter, setMonthFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Invoice>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const PAGE_SIZE = 10;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [invRes, sumRes] = await Promise.all([
        fetch(`${API}/fees/invoices`, { headers: authHeaders() }).catch(() => null),
        fetch(`${API}/fees/revenue/summary`, { headers: authHeaders() }).catch(() => null),
      ]);

      if (invRes && invRes.ok) {
        const json = await invRes.json();
        const raw: RawInvoice[] = Array.isArray(json) ? json : json.data ?? json.items ?? [];
        setInvoices(raw.map(mapInvoice));
      } else {
        if (!silent) setError(`Failed to load invoices`);
      }

      if (sumRes && sumRes.ok) {
        const sJson = await sumRes.json();
        setSummary(sJson.data ?? sJson);
      }
    } catch (e: any) {
      if (!silent) setError(e.message ?? "Network error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);


  const totalCollected =
    typeof summary.total_collected === "number" && summary.total_collected > 0
      ? summary.total_collected
      : invoices.reduce((s, i) => s + (Number(i.amountPaid) || 0), 0);

  const totalOutstanding =
    typeof summary.total_outstanding === "number" && summary.total_outstanding >= 0
      ? summary.total_outstanding
      : invoices
          .filter((i) => i.status !== "paid")
          .reduce((s, i) => s + Math.max(0, (Number(i.amountDue) || 0) - (Number(i.amountPaid) || 0) - (Number(i.discount) || 0)), 0);

  const overdueCount =
    summary.overdue_count ??
    invoices.filter((i) => {
      if (i.status === "paid") return false;
      try {
        const d = parseISO(i.dueDate);
        return isValid(d) && d < new Date();
      } catch {
        return false;
      }
    }).length;

  const totalInvoices = summary.total_invoices ?? invoices.length;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const partialCount = invoices.filter((i) => i.status === "partial").length;
  const pendingCount = (summary as any).pending_count ?? invoices.filter((i) => i.status === "pending").length;

  const stats = [
    {
      label: "Total Collected",
      value:
        totalCollected >= 100000
          ? `₹${(totalCollected / 100000).toFixed(1)}L`
          : `₹${(totalCollected || 0).toLocaleString("en-IN")}`,
      sub: `${paidCount} paid invoice${paidCount === 1 ? "" : "s"}`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Outstanding Balance",
      value:
        totalOutstanding >= 100000
          ? `₹${(totalOutstanding / 100000).toFixed(1)}L`
          : `₹${(totalOutstanding || 0).toLocaleString("en-IN")}`,
      sub: `${partialCount} partial payment${partialCount === 1 ? "" : "s"}`,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Overdue Count",
      value: overdueCount.toString(),
      sub: "invoices past due date",
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      label: "Total Invoices",
      value: totalInvoices.toString(),
      sub: `${pendingCount} pending`,
      icon: IndianRupee,
      color: "text-violet-600",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
    },
  ];

  const filtered = useMemo(() => {
    let list = [...invoices];

    if (statusFilter !== "ALL") {
      if (statusFilter === "overdue") {
        list = list.filter((i) => {
          if (i.status === "paid") return false;
          try {
            const d = parseISO(i.dueDate);
            return isValid(d) && d < new Date();
          } catch {
            return false;
          }
        });
      } else {
        list = list.filter((i) => i.status === statusFilter);
      }
    }

    if (monthFilter !== "ALL") list = list.filter((i) => i.installmentMonths.includes(monthFilter));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) => i.studentName.toLowerCase().includes(q) || i.invoiceNo.toLowerCase().includes(q) || i.grade.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [invoices, statusFilter, monthFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(field: keyof Invoice) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  }

  function safeDate(str: string) {
    try {
      const d = parseISO(str);
      return isValid(d) ? format(d, "dd MMM yyyy") : str;
    } catch {
      return str;
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 🚀 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Fee Management &amp; Revenue Ledger
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> Financial Hub
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor student tuition fee receipts, track pending installments, and manage overdue invoice ledgers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="rounded-xl border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-xs"
            title="Refresh fee ledger"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-semibold text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => load()} className="underline hover:text-destructive/80">
            Retry Connection
          </button>
        </div>
      )}

      {/* 📊 Executive KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={cn("rounded-2xl border bg-card p-5 shadow-sm space-y-1", s.border)}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <div className={cn("rounded-xl p-2", s.bg)}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
            </div>
            <p className="text-3xl font-extrabold tracking-tight">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* 🧭 View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          onClick={() => setViewTab("invoices")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs",
            viewTab === "invoices"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground border"
          )}
        >
          <IndianRupee className="h-3.5 w-3.5" />
          <span>Invoices Catalog</span>
        </button>

        <button
          onClick={() => setViewTab("installments")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs",
            viewTab === "installments"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground border"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Installments Schedule</span>
        </button>
      </div>

      {/* ── View Tab: Installments Schedule ───────────────────────────── */}
      {viewTab === "installments" ? (
        <div className="space-y-4 fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
            <div>
              <h3 className="font-bold text-sm">Student Installment Schedules</h3>
              <p className="text-xs text-muted-foreground">
                Track term payment schedules, due dates, and installment progress per student
              </p>
            </div>
            <div className="relative max-w-xs min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student name or invoice..."
                className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed bg-card text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-semibold text-sm">No installment schedules match your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((inv) => {
                const totalDue = inv.amountDue;
                const totalPaid = inv.amountPaid;
                const paidPct = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;

                const installments = resolveInstallments(
                  totalDue,
                  totalPaid,
                  inv.dueDate,
                  inv.payment_installment_schedule,
                  inv.payments
                );

                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm hover:shadow-md hover:border-violet-500/40 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/students/${inv.studentId}`}
                            className="font-bold text-base text-foreground hover:text-violet-600 transition-colors"
                          >
                            {inv.studentName}
                          </Link>
                          {inv.grade && (
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-semibold">
                              {inv.grade}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">Invoice #{inv.invoiceNo}</p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase">Total Fee</p>
                          <p className="font-extrabold text-sm">₹{totalDue.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase">Paid</p>
                          <p className="font-extrabold text-sm text-emerald-600">₹{totalPaid.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase">Remaining</p>
                          <p className="font-extrabold text-sm text-amber-600">
                            ₹{Math.max(0, totalDue - totalPaid).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              generateInvoicePDF({
                                invoiceNo: inv.invoiceNo,
                                date: inv.dueDate || inv.createdAt || format(new Date(), "yyyy-MM-dd"),
                                studentName: inv.studentName,
                                parentName: inv.parentName,
                                phone: inv.phone,
                                email: inv.email,
                                grade: inv.grade || "10th",
                                boardName: inv.boardName || "CBSE",
                                batchName: inv.batchName || "Standard Academic Batch",
                                totalFee: totalDue,
                                feePaid: totalPaid,
                                status: inv.status,
                                installments: installments.map((inst, i) => ({
                                  number: inst.number ?? i + 1,
                                  amount: inst.amount,
                                  dueDate: inst.dueDate,
                                  paid: inst.status === "PAID",
                                })),
                                paymentHistory: (inv.payments && inv.payments.length > 0)
                                  ? inv.payments.map((p, i) => ({
                                      date: p.paid_at ? p.paid_at.substring(0, 10) : (p.created_at ? p.created_at.substring(0, 10) : format(new Date(), "yyyy-MM-dd")),
                                      mode: p.payment_mode || "UPI",
                                      amount: parseFloat(p.amount) || 0,
                                      reference: p.transaction_ref || `REC-${inv.invoiceNo}-${i + 1}`,
                                    }))
                                  : totalPaid > 0
                                  ? [
                                      {
                                        date: inv.dueDate || format(new Date(), "yyyy-MM-dd"),
                                        mode: "UPI / DOWN PAYMENT",
                                        amount: totalPaid,
                                        reference: `REC-${inv.invoiceNo}`,
                                      },
                                    ]
                                  : [],
                              });
                              toast.success("Downloading PDF invoice...");
                            }}
                            className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950 transition-all flex items-center gap-1 shadow-2xs"
                            title="Direct Download PDF Invoice"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </button>
                          <Link
                            href={`/fees/${inv.id}`}
                            className="rounded-xl bg-violet-600/10 text-violet-600 px-3.5 py-1.5 text-xs font-bold hover:bg-violet-600 hover:text-white transition-all"
                          >
                            View Invoice →
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted-foreground">Installment Settlement Progress</span>
                        <span className="text-violet-600">{paidPct}% Cleared</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full transition-all duration-500"
                          style={{ width: `${paidPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                      {installments.map((inst, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-xl border p-3.5 text-xs space-y-2 transition-all",
                            inst.status === "PAID"
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : inst.status === "PARTIAL"
                              ? "bg-blue-500/10 border-blue-500/30"
                              : inst.status === "DUE"
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-muted/30 border-border"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{inst.label}</span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                                inst.status === "PAID"
                                  ? "bg-emerald-500 text-white"
                                  : inst.status === "PARTIAL"
                                  ? "bg-blue-500 text-white"
                                  : inst.status === "DUE"
                                  ? "bg-amber-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {inst.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Amount:</span>
                            <span className="font-bold text-foreground">₹{inst.amount.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground font-medium">Due Date:</span>
                            <span className="font-semibold text-foreground">{safeDate(inst.dueDate)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── View Tab: Invoices List ─────────────────────────────────────── */
        <>
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[240px] max-w-xs flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search student name or invoice #..."
                  className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground">Month:</label>
                <select
                  value={monthFilter}
                  onChange={(e) => {
                    setMonthFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="ALL">All Months</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {(["ALL", "paid", "pending", "partial", "overdue"] as const).map((s) => {
                const count =
                  s === "ALL"
                    ? invoices.length
                    : s === "overdue"
                    ? invoices.filter((i) => {
                        if (i.status === "paid") return false;
                        try {
                          const d = parseISO(i.dueDate);
                          return isValid(d) && d < new Date();
                        } catch {
                          return false;
                        }
                      }).length
                    : invoices.filter((i) => i.status === s).length;

                return (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all uppercase",
                      statusFilter === s ? "bg-foreground text-background shadow-xs" : "hover:bg-accent text-muted-foreground"
                    )}
                  >
                    {s === "ALL" ? "All" : STATUS_CFG[s as Status].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-card border animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed bg-card text-center">
              <IndianRupee className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-semibold text-sm">No invoices match your query.</p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card shadow-sm overflow-x-auto min-w-full">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground">
                    {[
                      { label: "Invoice #", field: "invoiceNo" as keyof Invoice },
                      { label: "Student", field: "studentName" as keyof Invoice },
                      { label: "Amount Settlement", field: "amountDue" as keyof Invoice },
                      { label: "Status", field: "status" as keyof Invoice },
                      { label: "Due Date", field: "dueDate" as keyof Invoice },
                      { label: "Installment Month", field: null },
                      { label: "Actions", field: null },
                    ].map((col) => (
                      <th key={col.label} className="px-4 py-3 text-left">
                        {col.field ? (
                          <button
                            onClick={() => toggleSort(col.field!)}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            {col.label}
                            <ArrowUpDown
                              className={cn("h-3 w-3", sortField === col.field ? "text-foreground" : "opacity-40")}
                            />
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginated.map((inv) => {
                    const pct =
                      inv.amountDue > 0 ? Math.min(100, Math.round((inv.amountPaid / inv.amountDue) * 100)) : 0;
                    const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.pending;
                    const dueParsed = parseISO(inv.dueDate);
                    const isOverdue = isValid(dueParsed) && dueParsed < new Date() && inv.status !== "paid";

                    return (
                      <tr key={inv.id} className="hover:bg-accent/40 transition-colors">
                        {/* Invoice # */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Link href={`/fees/${inv.id}`} className="font-bold text-xs text-violet-600 hover:underline">
                            #{inv.invoiceNo}
                          </Link>
                        </td>

                        {/* Student */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Link href={`/students/${inv.studentId}`} className="hover:text-primary transition-colors">
                            <p className="font-bold text-xs text-foreground">{inv.studentName}</p>
                            {inv.grade && <p className="text-[11px] text-muted-foreground font-medium">{inv.grade}</p>}
                          </Link>
                        </td>

                        {/* Amount Progress */}
                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[160px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-emerald-600">₹{inv.amountPaid.toLocaleString("en-IN")}</span>
                              <span className="text-muted-foreground font-medium">of ₹{inv.amountDue.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-violet-600")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase", cfg.cls)}>
                            {cfg.label}
                          </span>
                        </td>

                        {/* Due date */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={cn("text-xs font-semibold", isOverdue ? "text-red-500 font-bold" : "text-muted-foreground")}>
                            {safeDate(inv.dueDate)}
                          </span>
                        </td>

                        {/* Month badge */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground font-medium">
                            {inv.installmentMonths.length > 0
                              ? inv.installmentMonths
                                  .map((m) => {
                                    const [y, mo] = m.split("-");
                                    return `${MONTHS[parseInt(mo!) - 1]} ${y}`;
                                  })
                                  .join(", ")
                              : "—"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const insts = resolveInstallments(
                                inv.amountDue,
                                inv.amountPaid,
                                inv.dueDate,
                                inv.payment_installment_schedule,
                                inv.payments
                              );
                              generateInvoicePDF({
                                invoiceNo: inv.invoiceNo,
                                date: inv.dueDate || inv.createdAt || format(new Date(), "yyyy-MM-dd"),
                                studentName: inv.studentName,
                                parentName: inv.parentName,
                                phone: inv.phone,
                                email: inv.email,
                                grade: inv.grade || "10th",
                                boardName: inv.boardName || "CBSE",
                                batchName: inv.batchName || "Standard Academic Batch",
                                totalFee: inv.amountDue,
                                feePaid: inv.amountPaid,
                                status: inv.status,
                                installments: insts.map((inst, i) => ({
                                  number: inst.number ?? i + 1,
                                  amount: inst.amount,
                                  dueDate: inst.dueDate,
                                  paid: inst.status === "PAID",
                                })),
                                paymentHistory: (inv.payments && inv.payments.length > 0)
                                  ? inv.payments.map((p, i) => ({
                                      date: p.paid_at ? p.paid_at.substring(0, 10) : (p.created_at ? p.created_at.substring(0, 10) : format(new Date(), "yyyy-MM-dd")),
                                      mode: p.payment_mode || "UPI",
                                      amount: parseFloat(p.amount) || 0,
                                      reference: p.transaction_ref || `REC-${inv.invoiceNo}-${i + 1}`,
                                    }))
                                  : inv.amountPaid > 0
                                  ? [
                                      {
                                        date: inv.dueDate || format(new Date(), "yyyy-MM-dd"),
                                        mode: "UPI / DOWN PAYMENT",
                                        amount: inv.amountPaid,
                                        reference: `REC-${inv.invoiceNo}`,
                                      },
                                    ]
                                  : [],
                              });
                              toast.success("Downloading PDF invoice...");
                            }}
                            className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-[11px] font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors shadow-2xs"
                            title="Direct Download PDF Invoice"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground font-medium">
                {filtered.length} total invoices • Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl border p-1.5 disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl border p-1.5 disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
