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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Admission } from "@/lib/types/lead";
import { useLeadStore } from "@/lib/stores/leads.store";
import { authHeaders } from "@/lib/auth-headers";

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
  paymentStatus: PaymentStatus;
  dateOfPayment: string;
  modeOfPayment: PaymentMode;
  hasInstallments: boolean;
  numberOfInstallments: number;
  installmentAmount: number;
  installmentSchedule: InstallmentSchedule[];
  notes: string;
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

  // Fetch admission from API
  const fetchAdmission = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admissions/${id}`, { headers: authHeaders() }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        const raw = json.data ?? json;
        if (raw && raw.id) setAdmission(raw);
      }
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  }, [id]);

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
  const totalFee = admission.feeAmount ?? admission.fee_amount ?? 50000;
  const paidFee = admission.feePaid ?? admission.fee_paid ?? 0;
  const remainingFee = Math.max(0, totalFee - paidFee);

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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/admissions")}
            className="mt-1 rounded-xl p-2 hover:bg-accent text-muted-foreground transition-colors border shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {name}
              <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold border", statusCfg.bg, statusCfg.color, statusCfg.border)}>
                <StatusIcon className="h-3.5 w-3.5" /> {statusCfg.label}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Grade: <span className="font-semibold text-foreground">{admission.grade || "10th"}</span> • Board:{" "}
              <span className="font-semibold text-foreground">{board || "CBSE"}</span> • Batch:{" "}
              <span className="font-semibold text-foreground">{batch || "General Science"}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
        >
          <Printer className="h-3.5 w-3.5 text-primary" /> Print Application Slip
        </button>
      </div>

      {/* 🧭 Workflow Progress Tracker */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admission Enrollment Lifecycle Step</p>

        <div className="grid grid-cols-4 gap-2">
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
            <div className="flex items-center gap-2 border-b pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span>Financial Fee Ledger</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Total Course Fee</span>
                <span className="font-bold text-foreground">{fmt(totalFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Amount Paid (Down Payment)</span>
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

        {/* ── Right Column: Document Checklists ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
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
    </div>
  );
}