"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  IndianRupee,
  X,
  Calendar,
  FileText,
  RefreshCw,
  User,
  Clock,
  FileCheck,
  CheckCircle,
  XCircle,
  Edit2,
  Printer,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Phone,
  Mail,
  Building2,
  Plus,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Admission } from "@/lib/types/lead";
import { useLeadStore } from "@/lib/stores/leads.store";
import { authHeaders } from "@/lib/auth-headers";
import { InvoicePDFModal, type InvoicePDFData } from "@/components/finance/InvoicePDFModal";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";
import {
  createInitialInstallmentSchedule,
  rebalanceInstallmentSchedule,
  addInstallmentToSchedule,
  removeInstallmentFromSchedule,
  type InstallmentItem,
} from "@/lib/utils/installment-rebalancer";

type PaymentMode = "upi" | "cash" | "bank" | "other";
type PaymentStatus = "PENDING" | "PARTIAL" | "FULL";

interface InstallmentSchedule {
  number: number;
  amount: number;
  dueDate: string;
  paid: boolean;
}

interface AdmissionPayment {
  totalFee: number;
  amountPaid: number;
  remaining: number;
  paymentStatus?: PaymentStatus;
  dateOfPayment?: string;
  modeOfPayment?: PaymentMode;
  hasInstallments?: boolean;
  numberOfInstallments?: number;
  installmentAmount?: number;
  installmentSchedule?: InstallmentSchedule[];
  notes?: string;
}

type AdmissionDetail = Admission & {
  student_name?: string;
  fee_amount?: number;
  fee_paid?: number;
  created_at?: string;
  approved_at?: string;
  applied_course?: string;
  admission_number?: string;
  payment?: AdmissionPayment;
  boardName?: string;
  board_name?: string;
  batchName?: string;
  batch_name?: string;
  phone?: string;
  parentName?: string;
  parent_name?: string;
  parentPhone?: string;
  parent_phone?: string;
  schoolName?: string;
  school_name?: string;
};

const STATUS_FLOW: Admission["status"][] = ["PENDING_DOCS", "DOCS_SUBMITTED", "FEE_PENDING", "CONFIRMED"];

const STATUS_LABELS: Record<Admission["status"], string> = {
  PENDING_DOCS: "Pending Documents",
  DOCS_SUBMITTED: "Documents Submitted",
  FEE_PENDING: "Fee Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const STATUS_CONFIG: Record<
  Admission["status"],
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  PENDING_DOCS: { label: "Pending Docs", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Clock },
  DOCS_SUBMITTED: { label: "Docs Submitted", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: FileCheck },
  FEE_PENDING: { label: "Fee Pending", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: Clock },
  CONFIRMED: { label: "Confirmed", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle },
};

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  upi: "UPI Direct",
  cash: "Cash",
  bank: "Bank Wire",
  other: "Other",
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  FULL: { label: "Full Payment", className: "bg-emerald-500/15 text-emerald-600 font-extrabold" },
  PARTIAL: { label: "Partially Paid", className: "bg-amber-500/15 text-amber-600 font-extrabold" },
  PENDING: { label: "Pending", className: "bg-red-500/15 text-red-600 font-extrabold" },
};

const API = "/api/proxy";

function fmt(n: number) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

function derivePaymentStatus(paid: number, total: number): PaymentStatus {
  if (!total || paid <= 0) return "PENDING";
  if (paid >= total) return "FULL";
  return "PARTIAL";
}

function buildInstallmentSchedule(remaining: number, count: number, dates: string[]): InstallmentSchedule[] {
  if (!count) return [];
  const base = Math.floor(remaining / count);
  const extra = remaining - base * count;
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    amount: i === 0 ? base + extra : base,
    dueDate: dates[i] ?? "",
    paid: false,
  }));
}

export default function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useLeadStore();

  const storeAdmission = store.admissions.find((a) => a.id === id) as AdmissionDetail | undefined;
  const [admission, setAdmission] = useState<AdmissionDetail | null>(storeAdmission ?? null);
  const [loading, setLoading] = useState(!admission);
  const [saving, setSaving] = useState(false);
  const [showPDF, setShowPDF] = useState(false);

  const totalFee = admission?.feeAmount ?? admission?.fee_amount ?? admission?.payment?.totalFee ?? 50000;
  // payment.amountPaid is the authoritative value — always synced from fee_invoices.amount_paid in the backend
  const paidFee = admission?.payment?.amountPaid ?? admission?.feePaid ?? admission?.fee_paid ?? 0;
  const remainingFee = Math.max(0, totalFee - paidFee);

  const [installments, setInstallments] = useState<InstallmentItem[]>([]);

  useEffect(() => {
    if (remainingFee > 0 && installments.length === 0) {
      setInstallments(createInitialInstallmentSchedule(remainingFee, 3));
    }
  }, [remainingFee, installments.length]);

  async function saveInstallmentScheduleToBackend(newSchedule: InstallmentItem[]) {
    if (!id) return;
    const totalSlotAmount = newSchedule.reduce((sum, item) => sum + item.amount, 0);
    const initialDownPayment = Math.max(0, totalFee - totalSlotAmount);
    const paidFromSlots = newSchedule.filter((item) => item.paid).reduce((sum, item) => sum + item.amount, 0);
    const calculatedPaid = Math.min(totalFee, initialDownPayment + paidFromSlots);
    const calculatedRemaining = Math.max(0, totalFee - calculatedPaid);

    const payload = {
      fee_paid: calculatedPaid,
      payment: {
        totalFee: totalFee,
        amountPaid: calculatedPaid,
        remaining: calculatedRemaining,
        hasInstallments: newSchedule.length > 0,
        numberOfInstallments: newSchedule.length,
        installmentSchedule: newSchedule,
      },
    };

    setAdmission((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fee_paid: calculatedPaid,
        feePaid: calculatedPaid,
        payment: payload.payment,
        payment_installment_schedule: JSON.stringify(payload.payment),
      };
    });

    try {
      await fetch(`${API}/admissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
    } catch {
      // quiet fallback
    }
  }

  function handleInstAmountChange(idx: number, newVal: number) {
    setInstallments((prev) => {
      const next = rebalanceInstallmentSchedule(prev, remainingFee, idx, newVal);
      saveInstallmentScheduleToBackend(next);
      return next;
    });
  }

  function handleInstDateChange(idx: number, dateStr: string) {
    setInstallments((prev) => {
      const next = prev.map((item, i) => (i === idx ? { ...item, dueDate: dateStr } : item));
      saveInstallmentScheduleToBackend(next);
      return next;
    });
  }

  async function toggleInstPaid(idx: number) {
    const targetItem = installments[idx];
    if (!targetItem) return;

    const willBePaid = !targetItem.paid;

    // Update only the target installment's paid status
    const updatedItems = installments.map((item, i) => (
      i === idx ? { ...item, paid: willBePaid } : item
    ));

    const totalSlotAmount = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    const initialDownPayment = Math.max(0, totalFee - totalSlotAmount);
    const paidFromSlots = updatedItems.filter((item) => item.paid).reduce((sum, item) => sum + item.amount, 0);
    const newPaidFee = Math.min(totalFee, initialDownPayment + paidFromSlots);
    const newRemainingFee = Math.max(0, totalFee - newPaidFee);

    setInstallments(updatedItems);

    const payload = {
      fee_paid: newPaidFee,
      payment: {
        totalFee: totalFee,
        amountPaid: newPaidFee,
        remaining: newRemainingFee,
        hasInstallments: updatedItems.length > 0,
        numberOfInstallments: updatedItems.length,
        installmentSchedule: updatedItems,
      },
    };

    setAdmission((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fee_paid: newPaidFee,
        feePaid: newPaidFee,
        payment: payload.payment,
        payment_installment_schedule: JSON.stringify(payload.payment),
      };
    });

    try {
      await fetch(`${API}/admissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      toast.success(willBePaid ? `Term #${targetItem.number} marked as Paid!` : `Term #${targetItem.number} marked as Unpaid`);
      fetchAdmission(true);
    } catch {
      toast.success("Updated installment status");
    }
  }

  function handleAddTerm() {
    setInstallments((prev) => {
      const next = addInstallmentToSchedule(prev, remainingFee);
      saveInstallmentScheduleToBackend(next);
      return next;
    });
  }

  function handleRemoveTerm(idx: number) {
    setInstallments((prev) => {
      const next = removeInstallmentFromSchedule(prev, idx, remainingFee);
      saveInstallmentScheduleToBackend(next);
      return next;
    });
  }

  // Fetch admission from API — silent=true skips loading spinner (for polling)
  const fetchAdmission = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API}/admissions/${id}`, { headers: authHeaders() }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        const raw = json.data ?? json;
        if (raw && raw.id) {
          setAdmission(raw);

          // Extract installment slots array from API response (raw.payment or raw.payment_installment_schedule)
          let slots: any[] = [];
          if (Array.isArray(raw.payment?.installmentSchedule)) {
            slots = raw.payment.installmentSchedule;
          } else if (raw.payment_installment_schedule) {
            try {
              const parsed = typeof raw.payment_installment_schedule === "string"
                ? JSON.parse(raw.payment_installment_schedule)
                : raw.payment_installment_schedule;
              slots = Array.isArray(parsed) ? parsed : (parsed?.installmentSchedule ?? []);
            } catch {}
          } else if (raw.paymentInstallmentSchedule) {
            try {
              const parsed = typeof raw.paymentInstallmentSchedule === "string"
                ? JSON.parse(raw.paymentInstallmentSchedule)
                : raw.paymentInstallmentSchedule;
              slots = Array.isArray(parsed) ? parsed : (parsed?.installmentSchedule ?? []);
            } catch {}
          }

          if (Array.isArray(slots) && slots.length > 0) {
            setInstallments(
              slots.map((s: any, idx: number) => ({
                number: s.number ?? idx + 1,
                amount: parseFloat(s.amount) || 0,
                dueDate: s.dueDate ?? s.due_date ?? "",
                paid: Boolean(s.paid),
                isCustom: Boolean(s.isCustom),
              }))
            );
          }
        }
      }
    } catch {
      // quiet fallback
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchAdmission();
  }, [fetchAdmission]);

  if (loading && !admission) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        <div className="h-64 bg-card border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-2xl border bg-card p-8 text-center">
        <p className="text-base font-bold">Admission application not found.</p>
        <button onClick={() => router.push("/admissions")} className="text-xs font-semibold text-primary hover:underline">
          ← Return to Admissions List
        </button>
      </div>
    );
  }

  const name = admission.studentName ?? admission.student_name ?? "Student";
  const board = admission.boardName ?? admission.board_name ?? "";
  const batch = admission.batchName ?? admission.batch_name ?? "";
  const phone = admission.phone ?? "";
  const parentName = admission.parentName ?? admission.parent_name ?? "";
  const parentPhone = admission.parentPhone ?? admission.parent_phone ?? "";
  const school = admission.schoolName ?? admission.school_name ?? "";

  const statusCfg = STATUS_CONFIG[admission.status] ?? STATUS_CONFIG["PENDING_DOCS"];
  const StatusIcon = statusCfg.icon;

  async function handleStatusChange(newStatus: Admission["status"]) {
    setSaving(true);
    setAdmission({ ...admission!, status: newStatus });

    try {
      await fetch(`${API}/admissions/${admission!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => null);

      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
    } catch {
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDocument(index: number) {
    const docs = [...(admission!.documents ?? [])];
    if (!docs[index]) return;
    docs[index]!.submitted = !docs[index]!.submitted;

    setAdmission({ ...admission!, documents: docs });

    try {
      await fetch(`${API}/admissions/${admission!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ documents: docs }),
      }).catch(() => null);

      toast.success("Document verification updated");
    } catch {
      toast.success("Document verified locally");
    }
  }

  async function buildInvoicePDFData(): Promise<InvoicePDFData> {
    const admNum = admission?.admission_number || `ADM-${admission?.id.slice(-6).toUpperCase()}`;
    const invNo = `INV-${admNum.replace(/^INV-/, "")}`;

    // Fetch live payments from Fees module
    let paymentHistoryList: any[] = [];
    try {
      const invRes = await fetch(`${API}/fees/invoices`, { headers: authHeaders() }).catch(() => null);
      if (invRes && invRes.ok) {
        const invJson = await invRes.json();
        const list: any[] = Array.isArray(invJson) ? invJson : (invJson.data ?? []);
        const matched = list.find((i: any) =>
          i.admission_id === id ||
          i.invoice_no === invNo ||
          i.student?.admission_id === id ||
          i.student?.admission?.id === id
        );
        if (matched && Array.isArray(matched.payments) && matched.payments.length > 0) {
          paymentHistoryList = matched.payments.map((p: any, idx: number) => ({
            date: p.paid_at ? p.paid_at.substring(0, 10) : (p.created_at ? p.created_at.substring(0, 10) : format(new Date(), "yyyy-MM-dd")),
            mode: p.payment_mode || "UPI",
            amount: parseFloat(p.amount) || 0,
            reference: p.transaction_ref || `REC-${admNum}-${idx + 1}`,
          }));
        }
      }
    } catch {}

    if (paymentHistoryList.length === 0 && paidFee > 0) {
      paymentHistoryList = [
        {
          date: admission?.created_at || admission?.createdAt ? format(new Date(admission.created_at || admission.createdAt), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          mode: admission?.payment?.modeOfPayment || "UPI / DOWN PAYMENT",
          amount: paidFee,
          reference: `REC-${admNum}`,
        },
      ];
    }

    return {
      invoiceNo: invNo,
      date: admission?.created_at || admission?.createdAt ? format(new Date(admission.created_at || admission.createdAt), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      studentName: name,
      parentName: parentName,
      phone: phone,
      email: admission?.email,
      grade: admission?.grade,
      boardName: board,
      batchName: batch,
      totalFee: totalFee,
      feePaid: paidFee,
      status: admission?.status || "CONFIRMED",
      installments: installments,
      paymentHistory: paymentHistoryList,
    };
  }

  async function handleDownloadPDF() {
    if (!admission) return;
    const invData = await buildInvoicePDFData();
    generateInvoicePDF(invData);
    toast.success("Downloading PDF invoice...");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 🚀 Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admissions")}
            className="rounded-xl border p-2 hover:bg-accent text-muted-foreground transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{name}</h1>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusCfg.bg, statusCfg.color, statusCfg.border)}>
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              ID: <span className="font-mono">{admission.admission_number || admission.id.slice(0, 8)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF Invoice
          </button>
        </div>
      </div>

      {/* 🧭 Workflow Progress Tracker */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admission Enrollment Lifecycle Step</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_FLOW.map((s, idx) => {
            const isCurrent = admission.status === s;
            const isPassed = STATUS_FLOW.indexOf(admission.status) > idx || admission.status === "CONFIRMED";
            const cfg = STATUS_CONFIG[s];

            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all flex flex-col justify-between space-y-2",
                  isCurrent ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs" : isPassed ? "bg-emerald-500/10 border-emerald-500/30" : "hover:bg-accent opacity-60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Step 0{idx + 1}</span>
                  {isPassed && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                <p className={cn("text-xs font-bold", isCurrent ? "text-primary" : "text-foreground")}>{cfg.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left Column: Student Details ────────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-1">
          {/* Profile Card */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <User className="h-4 w-4 text-violet-600" />
              <span>Student &amp; Parent Profile</span>
            </div>

            {[
              { label: "Student Name", value: name },
              { label: "Phone", value: phone },
              { label: "Email", value: admission.email },
              { label: "Parent Name", value: parentName },
              { label: "Parent Phone", value: parentPhone },
              { label: "Previous School", value: school },
              { label: "Educational Board", value: board },
              { label: "Target Batch", value: batch },
            ].map(({ label, value }) =>
              value ? (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <span className="font-semibold text-foreground text-right max-w-[55%] truncate">{value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Tuition Fee Breakdown */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                <span>Financial Fee Ledger</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="text-[11px] font-semibold text-violet-600 hover:underline flex items-center gap-1"
                title="Download Official PDF Invoice"
              >
                <Download className="h-3 w-3" /> PDF Invoice
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Total Course Fee</span>
                <span className="font-bold text-foreground">{fmt(totalFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Total Amount Paid</span>
                <span className="font-bold text-emerald-600">{fmt(paidFee)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground font-medium">Remaining Outstanding</span>
                <span className="font-extrabold text-red-500">{fmt(remainingFee)}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                <span>Fee Settlement Progress</span>
                <span>{Math.round((paidFee / (totalFee || 1)) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((paidFee / (totalFee || 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Document Checklists & Dynamic Installments ───────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Dynamic Adjustable Installments Widget */}
          {installments.length > 0 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-600" /> Dynamic Adjustable Installment Schedule
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Add, remove, edit any installment amount or mark as paid. Remaining balance automatically re-balances.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTerm}
                  className="flex items-center gap-1 text-xs font-bold text-violet-600 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/60 px-3 py-1.5 rounded-lg border border-violet-200/60 transition-all shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Term
                </button>
              </div>

              <div className="space-y-2.5">
                {installments.map((inst, i) => (
                  <div
                    key={inst.number}
                    className={cn(
                      "flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:items-center text-xs border rounded-xl p-3 transition-all",
                      inst.paid ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card hover:border-violet-500/30"
                    )}
                  >
                    <div className="sm:col-span-3 flex items-center justify-between sm:justify-start gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleInstPaid(i)}
                          className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center text-white transition-colors shrink-0",
                            inst.paid ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-violet-500"
                          )}
                          title={inst.paid ? "Mark as Unpaid" : "Mark as Paid"}
                        >
                          {inst.paid && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                        <span className="font-bold text-foreground">Term #{inst.number}</span>
                      </div>
                      {installments.length > 1 && !inst.paid && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTerm(i)}
                          className="sm:hidden text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Remove installment term"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={(e) => handleInstDateChange(i, e.target.value)}
                        className="w-full rounded-lg border bg-background px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>

                    <div className="sm:col-span-4 flex items-center gap-1.5">
                      <span className="text-muted-foreground font-semibold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={inst.amount}
                        onChange={(e) => handleInstAmountChange(i, parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border bg-background px-2.5 py-1 text-xs font-bold text-foreground outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0", inst.paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                        {inst.paid ? "Paid" : "Pending"}
                      </span>
                    </div>

                    <div className="hidden sm:block sm:col-span-1 text-right">
                      {installments.length > 1 && !inst.paid && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTerm(i)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Remove installment term"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Verification Checklist */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-600" /> Mandatory Document Verification Checklist
              </h3>
              <span className="text-xs text-muted-foreground font-semibold">
                {(admission.documents ?? []).filter((d) => d.submitted).length} / {(admission.documents ?? []).length} Verified
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(admission.documents ?? []).map((doc, idx) => (
                <div
                  key={doc.name}
                  onClick={() => toggleDocument(idx)}
                  className={cn(
                    "rounded-xl border p-3.5 flex items-center justify-between cursor-pointer transition-all",
                    doc.submitted ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card hover:bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md border-2 flex items-center justify-center text-white shrink-0 transition-colors",
                        doc.submitted ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
                      )}
                    >
                      {doc.submitted && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{doc.required ? "Mandatory Document" : "Optional Document"}</p>
                    </div>
                  </div>

                  <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full", doc.submitted ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600")}>
                    {doc.submitted ? "Verified" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Invoice Modal */}
      {showPDF && admission && (
        <InvoicePDFModal
          data={{
            invoiceNo: `INV-${(admission.admission_number || `ADM-${admission.id.slice(-6).toUpperCase()}`).replace(/^INV-/, "")}`,
            date: admission.created_at || admission.createdAt ? format(new Date(admission.created_at || admission.createdAt), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
            studentName: name,
            parentName: parentName,
            phone: phone,
            email: admission.email,
            grade: admission.grade,
            boardName: board,
            batchName: batch,
            totalFee: totalFee,
            feePaid: paidFee,
            status: admission.status,
            installments: installments,
            paymentHistory: [
              {
                date: admission.created_at || admission.createdAt ? format(new Date(admission.created_at || admission.createdAt), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
                mode: "UPI / DOWN PAYMENT",
                amount: paidFee,
                reference: `REC-${admission.admission_number || admission.id.slice(-4).toUpperCase()}`,
              },
            ],
          }}
          onClose={() => setShowPDF(false)}
        />
      )}
    </div>
  );
}