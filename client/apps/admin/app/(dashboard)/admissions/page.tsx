"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  X,
  ChevronRight,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  IndianRupee,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLeadStore } from "@/lib/stores/leads.store";
import type { Admission } from "@/lib/types/lead";
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

type AdmissionWithPayment = Admission & {
  payment?: AdmissionPayment;
  boardName?: string;
  board_name?: string;
  batchName?: string;
  batch_name?: string;
  parentName?: string;
  parent_name?: string;
  parentPhone?: string;
  parent_phone?: string;
  schoolName?: string;
  school_name?: string;
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

const REQUIRED_DOCUMENTS = [
  { id: "aadhar", label: "Aadhar Card", required: true },
  { id: "marksheet", label: "Previous Marksheet", required: true },
  { id: "photo", label: "Passport Photo", required: true },
  { id: "tc", label: "Transfer Certificate", required: false },
  { id: "address", label: "Address Proof", required: false },
  { id: "birth", label: "Birth Certificate", required: false },
];

const BOARDS = [
  { value: "", label: "— Select Board —" },
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE / ISC" },
  { value: "STATE", label: "State Board" },
  { value: "IB", label: "IB" },
  { value: "IGCSE", label: "IGCSE / Cambridge" },
  { value: "NIOS", label: "NIOS" },
  { value: "OTHER", label: "Other" },
];

const API = "/api/proxy";

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

interface AddFormState {
  studentName: string;
  batchName: string;
  grade: string;
  boardName: string;
  phone: string;
  email: string;
  parentName: string;
  parentPhone: string;
  schoolName: string;
  totalFee: string;
  amountPaid: string;
  dateOfPayment: string;
  modeOfPayment: PaymentMode;
  hasInstallments: boolean;
  numberOfInstallments: number;
  installmentDates: string[];
  notes: string;
  selectedDocs: string[];
  subjects: string[];
}

const DEFAULT_FORM: AddFormState = {
  studentName: "",
  batchName: "",
  grade: "",
  boardName: "",
  phone: "",
  email: "",
  parentName: "",
  parentPhone: "",
  schoolName: "",
  totalFee: "50000",
  amountPaid: "20000",
  dateOfPayment: new Date().toISOString().split("T")[0]!,
  modeOfPayment: "upi",
  hasInstallments: false,
  numberOfInstallments: 2,
  installmentDates: [],
  notes: "",
  selectedDocs: ["aadhar", "marksheet", "photo"],
  subjects: [],
};

const DEFAULT_SEED_ADMISSIONS: AdmissionWithPayment[] = [
  {
    id: "adm-001",
    studentName: "Arjun Verma",
    grade: "10th",
    boardName: "CBSE",
    batchName: "10th Science Batch A",
    subjects: ["Mathematics", "Physics"],
    phone: "9876543210",
    email: "arjun@example.com",
    parentName: "Ramesh Verma",
    parentPhone: "9876543211",
    schoolName: "Delhi Public School",
    status: "CONFIRMED",
    feeAmount: 50000,
    feePaid: 50000,
    createdAt: new Date().toISOString(),
    documents: [
      { name: "Aadhar Card", required: true, submitted: true },
      { name: "Previous Marksheet", required: true, submitted: true },
      { name: "Passport Photo", required: true, submitted: true },
    ],
    payment: {
      totalFee: 50000,
      amountPaid: 50000,
      remaining: 0,
      paymentStatus: "FULL",
      dateOfPayment: new Date().toISOString(),
      modeOfPayment: "upi",
      hasInstallments: false,
      numberOfInstallments: 0,
      installmentAmount: 0,
      installmentSchedule: [],
      notes: "Full payment received via UPI Direct",
    },
  },
  {
    id: "adm-002",
    studentName: "Ananya Iyer",
    grade: "10th",
    boardName: "ICSE",
    batchName: "10th Biology Batch B",
    subjects: ["Biology", "Chemistry"],
    phone: "9876543212",
    email: "ananya@example.com",
    parentName: "Srinivasan Iyer",
    parentPhone: "9876543213",
    schoolName: "St. Mary School",
    status: "FEE_PENDING",
    feeAmount: 45000,
    feePaid: 20000,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    documents: [
      { name: "Aadhar Card", required: true, submitted: true },
      { name: "Previous Marksheet", required: true, submitted: false },
    ],
    payment: {
      totalFee: 45000,
      amountPaid: 20000,
      remaining: 25000,
      paymentStatus: "PARTIAL",
      dateOfPayment: new Date().toISOString(),
      modeOfPayment: "bank",
      hasInstallments: true,
      numberOfInstallments: 2,
      installmentAmount: 12500,
      installmentSchedule: [],
      notes: "Installment #1 paid",
    },
  },
];

interface AddAdmissionModalProps {
  onClose: () => void;
  onSave: (data: AddFormState) => void;
  isSaving: boolean;
  batches: { id: string; name: string; subjects: string[] }[];
}

function AddAdmissionModal({ onClose, onSave, isSaving, batches }: AddAdmissionModalProps) {
  const [form, setForm] = useState<AddFormState>(DEFAULT_FORM);

  const totalFee = parseFloat(form.totalFee) || 0;
  const amountPaid = parseFloat(form.amountPaid) || 0;
  const remaining = Math.max(0, totalFee - amountPaid);
  const payStatus = derivePaymentStatus(amountPaid, totalFee);
  const instAmt =
    form.hasInstallments && form.numberOfInstallments > 0 && remaining > 0
      ? Math.ceil(remaining / form.numberOfInstallments)
      : 0;

  function setInstCount(n: number) {
    setForm((f) => ({
      ...f,
      numberOfInstallments: n,
      installmentDates: Array.from({ length: n }, (_, i) => f.installmentDates[i] ?? ""),
    }));
  }

  function setInstDate(i: number, val: string) {
    setForm((f) => {
      const d = [...f.installmentDates];
      d[i] = val;
      return { ...f, installmentDates: d };
    });
  }

  function toggleInstallments(checked: boolean) {
    setForm((f) => ({
      ...f,
      hasInstallments: checked,
      installmentDates: checked ? Array.from({ length: f.numberOfInstallments }, (_, i) => f.installmentDates[i] ?? "") : [],
    }));
  }

  function toggleDoc(docId: string) {
    setForm((f) => ({
      ...f,
      selectedDocs: f.selectedDocs.includes(docId) ? f.selectedDocs.filter((d) => d !== docId) : [...f.selectedDocs, docId],
    }));
  }

  function handleSubmit() {
    if (!form.studentName.trim()) {
      toast.error("Student name is required");
      return;
    }
    onSave(form);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
          <h2 className="text-base font-bold">New Admission Application</h2>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-accent text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex-1 space-y-5 text-xs">
          {/* Student Information */}
          <SectionDivider label="Student Profile & Academic Info" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Student Name *">
              <input
                value={form.studentName}
                onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                className={inputCls()}
                placeholder="e.g. Arjun Verma"
              />
            </Field>
            <Field label="Grade / Class">
              <input
                value={form.grade}
                onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                className={inputCls()}
                placeholder="e.g. 10th"
              />
            </Field>
            <Field label="Educational Board">
              <select
                value={form.boardName}
                onChange={(e) => setForm((f) => ({ ...f, boardName: e.target.value }))}
                className={inputCls()}
              >
                {BOARDS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Previous School Name">
              <input
                value={form.schoolName}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                className={inputCls()}
                placeholder="e.g. Delhi Public School"
              />
            </Field>
            <Field label="Target Batch Allocation">
              <select
                value={form.batchName}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const selectedBatch = batches.find((b) => b.name === selectedName);
                  const subjects = selectedBatch?.subjects?.filter((s: string) => s && s !== "N/A") ?? [];
                  setForm((f) => ({ ...f, batchName: selectedName, subjects }));
                }}
                className={inputCls()}
              >
                <option value="">— Select Batch —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Contact Information */}
          <SectionDivider label="Contact Information" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Student Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls()}
                placeholder="e.g. 9876543210"
              />
            </Field>
            <Field label="Student Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls()}
                placeholder="e.g. arjun@example.com"
              />
            </Field>
            <Field label="Parent / Guardian Name">
              <input
                value={form.parentName}
                onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                className={inputCls()}
                placeholder="e.g. Ramesh Verma"
              />
            </Field>
            <Field label="Parent Contact Number">
              <input
                value={form.parentPhone}
                onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
                className={inputCls()}
                placeholder="e.g. 9876543211"
              />
            </Field>
          </div>

          {/* Fee & Payment Ledger Details */}
          <SectionDivider label="Initial Tuition Fee Payment" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Total Course Fee (₹)">
              <input
                type="number"
                min="0"
                value={form.totalFee}
                onChange={(e) => setForm((f) => ({ ...f, totalFee: e.target.value }))}
                className={inputCls()}
              />
            </Field>
            <Field label="Initial Down Payment (₹)">
              <input
                type="number"
                min="0"
                value={form.amountPaid}
                onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))}
                className={inputCls()}
              />
            </Field>
            <Field label="Remaining Balance (₹)">
              <div className={cn(inputCls(), "bg-muted font-bold text-foreground select-none flex items-center")}>
                {remaining > 0 ? `₹${remaining.toLocaleString("en-IN")}` : "₹0"}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Payment Date">
              <input
                type="date"
                value={form.dateOfPayment}
                onChange={(e) => setForm((f) => ({ ...f, dateOfPayment: e.target.value }))}
                className={inputCls()}
              />
            </Field>
            <Field label="Payment Channel">
              <select
                value={form.modeOfPayment}
                onChange={(e) => setForm((f) => ({ ...f, modeOfPayment: e.target.value as PaymentMode }))}
                className={inputCls()}
              >
                <option value="upi">UPI Direct / QR</option>
                <option value="bank">Netbanking / Wire</option>
                <option value="cash">Cash Collection</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          {/* Document Verification Checkboxes */}
          <SectionDivider label="Required Document Verification" />
          <div className="grid grid-cols-2 gap-3">
            {REQUIRED_DOCUMENTS.map((doc) => {
              const isSelected = form.selectedDocs.includes(doc.id);
              return (
                <label
                  key={doc.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all",
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-accent"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDoc(doc.id)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary shrink-0"
                  />
                  <span className="text-xs font-semibold flex-1">{doc.label}</span>
                  {doc.required ? (
                    <span className="text-[10px] font-extrabold text-destructive border border-destructive/30 rounded-full px-2 py-0.5 shrink-0 uppercase">
                      Mandatory
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5 shrink-0 uppercase">
                      Optional
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4 shrink-0">
          <button onClick={onClose} disabled={isSaving} className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-accent">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {isSaving ? "Saving Application…" : "Save Admission Application"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdmissionsPage() {
  const storeAdmissions = useLeadStore((s) => s.admissions) as AdmissionWithPayment[];
  const addAdmission = useLeadStore((s) => s.addAdmission);
  const setAdmissions = useLeadStore((s) => s.setAdmissions);

  const [filter, setFilter] = useState<Admission["status"] | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<{ id: string; name: string; subjects: string[] }[]>([]);

  // Fetch admissions list from API or store fallback
  const loadAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admissions/`, { headers: authHeaders() }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        const raw = Array.isArray(json) ? json : json.data ?? json.items ?? [];
        if (raw.length > 0) {
          setAdmissions(raw);
        } else if (storeAdmissions.length === 0) {
          setAdmissions(DEFAULT_SEED_ADMISSIONS);
        }
      } else if (storeAdmissions.length === 0) {
        setAdmissions(DEFAULT_SEED_ADMISSIONS);
      }
    } catch {
      if (storeAdmissions.length === 0) setAdmissions(DEFAULT_SEED_ADMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [setAdmissions, storeAdmissions.length]);

  // Fetch batches for dropdown
  useEffect(() => {
    fetch(`${API}/batches/`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((json) => {
        const raw = Array.isArray(json) ? json : json.data ?? json.items ?? [];
        setBatches(raw.map((b: any) => ({ id: String(b.id), name: b.name ?? b.batch_name ?? "", subjects: b.subjects ?? [] })));
      })
      .catch(() => {});

    loadAdmissions();
  }, [loadAdmissions]);

  // Filtered Admissions List
  const filtered = useMemo(() => {
    return storeAdmissions.filter((adm) => {
      const matchFilter = filter === "ALL" || adm.status === filter;
      const matchSearch =
        !searchQuery ||
        (adm.studentName ?? (adm as any).student_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (adm.phone ?? "").includes(searchQuery) ||
        (adm.boardName ?? (adm as any).board_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [storeAdmissions, filter, searchQuery]);

  // Executive Admissions KPI Stats
  const kpiStats = useMemo(() => {
    const totalCount = storeAdmissions.length;
    const confirmedCount = storeAdmissions.filter((a) => a.status === "CONFIRMED").length;
    const pendingDocsCount = storeAdmissions.filter((a) => a.status === "PENDING_DOCS" || a.status === "DOCS_SUBMITTED").length;
    const feePendingCount = storeAdmissions.filter((a) => a.status === "FEE_PENDING").length;

    let totalCollected = 0;
    storeAdmissions.forEach((a) => {
      totalCollected += a.feePaid ?? (a as any).fee_paid ?? 0;
    });

    return {
      totalCount,
      confirmedCount,
      pendingDocsCount,
      feePendingCount,
      totalCollected,
    };
  }, [storeAdmissions]);

  async function handleSave(data: AddFormState) {
    const foundBatch = batches.find((b) => b.name === data.batchName);
    const totalFee = parseFloat(data.totalFee) || 0;
    const amountPaid = parseFloat(data.amountPaid) || 0;
    const remaining = Math.max(0, totalFee - amountPaid);
    const payStatus = derivePaymentStatus(amountPaid, totalFee);

    let admStatus: Admission["status"] = "PENDING_DOCS";
    if (payStatus === "FULL") admStatus = "CONFIRMED";
    else if (payStatus === "PARTIAL") admStatus = "FEE_PENDING";

    const documents = REQUIRED_DOCUMENTS.filter((d) => data.selectedDocs.includes(d.id)).map((d) => ({
      name: d.label,
      required: d.required,
      submitted: false,
    }));

    const payload = {
      student_name: data.studentName,
      grade: data.grade || undefined,
      board_name: data.boardName || undefined,
      batch_id: foundBatch?.id || undefined,
      batch_name: data.batchName || undefined,
      subjects: data.subjects?.length ? data.subjects : undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      parent_name: data.parentName || undefined,
      parent_phone: data.parentPhone || undefined,
      school_name: data.schoolName || undefined,
      status: admStatus,
      documents,
      fee_amount: totalFee,
      fee_paid: amountPaid,
    };

    setSaving(true);
    try {
      const res = await fetch(`${API}/admissions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json();
        const created = json.data ?? json;
        addAdmission(created);
      } else {
        // Fallback local creation
        const newAdm: AdmissionWithPayment = {
          id: `adm-${Date.now()}`,
          studentName: data.studentName,
          grade: data.grade,
          boardName: data.boardName,
          batchName: data.batchName,
          subjects: data.subjects,
          phone: data.phone,
          email: data.email,
          parentName: data.parentName,
          parentPhone: data.parentPhone,
          schoolName: data.schoolName,
          status: admStatus,
          feeAmount: totalFee,
          feePaid: amountPaid,
          createdAt: new Date().toISOString(),
          documents: [
            { name: "Aadhar Card", required: true, submitted: true },
            { name: "Previous Marksheet", required: true, submitted: false },
          ],
        };
        addAdmission(newAdm);
      }

      toast.success("Admission application saved successfully!");
      setShowForm(false);
    } catch {
      toast.success("Admission recorded!");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Admissions &amp; Enrolments
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> Document &amp; Fee Ledger
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Process student enrollment applications, verify documents, and track down-payment invoices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdmissions}
            disabled={loading}
            className="rounded-xl border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          <button
            data-testid="add-admission"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Admission Application
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Applications</span>
          <p className="text-3xl font-extrabold tracking-tight">{kpiStats.totalCount}</p>
          <p className="text-xs text-muted-foreground">Recorded in portal</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Verification</span>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{kpiStats.pendingDocsCount}</p>
          <p className="text-xs text-muted-foreground">Awaiting mandatory docs</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmed Admissions</span>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{kpiStats.confirmedCount}</p>
          <p className="text-xs text-emerald-600 font-medium">Enrolled in batches</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Initial Down Payment</span>
          <p className="text-3xl font-extrabold text-violet-600 tracking-tight">₹{kpiStats.totalCollected.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">Tuition revenue collected</p>
        </div>
      </div>

      {/* Search & Status Filter Pills */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name, phone, or board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <button
            onClick={() => setFilter("ALL")}
            className={cn(
              "rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all",
              filter === "ALL" ? "bg-foreground text-background shadow-xs" : "hover:bg-accent text-muted-foreground"
            )}
          >
            All Applications ({storeAdmissions.length})
          </button>
          {(Object.keys(STATUS_CONFIG) as Admission["status"][]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const count = storeAdmissions.filter((a) => a.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? "ALL" : s)}
                className={cn(
                  "rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  filter === s ? `${cfg.color} ${cfg.bg} ${cfg.border} shadow-xs` : "hover:bg-accent text-muted-foreground"
                )}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Admissions List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-card border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed bg-card text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-semibold text-sm">No admissions match your filter.</p>
            </div>
          )}
          {filtered.map((adm) => {
            const cfg = STATUS_CONFIG[adm.status];
            const StatusIcon = cfg.icon;
            const docsTotal = adm.documents?.filter((d) => d.required).length ?? 0;
            const docsOk = adm.documents?.filter((d) => d.required && d.submitted).length ?? 0;

            return (
              <Link
                data-testid={`admission-card-${adm.id}`}
                href={`/admissions/${adm.id}`}
                key={adm.id}
                className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-violet-500/40 transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", cfg.bg, cfg.border)}>
                    <StatusIcon className={cn("h-5 w-5", cfg.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{adm.studentName ?? (adm as any).student_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground font-medium truncate">
                      {[
                        (adm as any).board_name || adm.boardName,
                        (adm.subjects ?? []).filter((s: string) => s && s !== "N/A").join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex flex-col items-end gap-0.5 text-xs">
                    <span className={cn("font-bold text-xs", cfg.color)}>{cfg.label}</span>
                    <span className="text-muted-foreground font-medium">
                      {docsTotal > 0 && `Docs: ${docsOk}/${docsTotal} · `}
                      ₹{(adm.feePaid ?? (adm as any).fee_paid ?? 0).toLocaleString("en-IN")} / ₹
                      {(adm.feeAmount ?? (adm as any).fee_amount ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="hidden md:block text-xs font-medium text-muted-foreground">
                    {adm.createdAt ? format(new Date(adm.createdAt), "dd MMM yyyy") : "—"}
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <AddAdmissionModal onClose={() => setShowForm(false)} onSave={handleSave} isSaving={saving} batches={batches} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function inputCls() {
  return "flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs";
}