"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, CreditCard, Clock, IndianRupee } from "lucide-react";
import { format, parseISO, isValid, subDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = "/api/proxy";

function authHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dotColor: string }> = {
  paid:    { label: "Paid",    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400", dotColor: "bg-emerald-500" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",          dotColor: "bg-amber-500"   },
  partial: { label: "Partial", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400",               dotColor: "bg-blue-500"    },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400",                    dotColor: "bg-red-500"     },
  due:     { label: "Due",     className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",           dotColor: "bg-amber-500"   },
};

const MODE_LABELS: Record<string, string> = {
  cash:          "Cash",
  upi:           "UPI",
  bank_transfer: "Bank Transfer",
  cheque:        "Cheque",
  card:          "Card",
};

type Tab = "summary" | "installments" | "payments";

interface InstallmentSlot {
  label:         string;
  number:        number;
  amount:        number;
  dueDate:       string;
  paid:          boolean;
  partial:       boolean;
  overdue:       boolean;
  paidAmount:    number;
  instRemaining: number;
  statusKey:     string;
}

function resolveInstallments(
  totalDue: number,
  totalPaid: number,
  invoiceDueDate: string,
  paymentInstallmentSchedule?: string | object | null
): InstallmentSlot[] {
  let rawSlots: any[] = [];
  let numInstallments = 1;
  let hasInstallments = false;
  let schedAmountPaid = 0;

  if (paymentInstallmentSchedule) {
    try {
      const sched = typeof paymentInstallmentSchedule === "string"
        ? JSON.parse(paymentInstallmentSchedule)
        : paymentInstallmentSchedule;

      hasInstallments = Boolean(sched?.hasInstallments);
      numInstallments = parseInt(sched?.numberOfInstallments) || 0;
      schedAmountPaid = parseFloat(sched?.amountPaid) || 0;

      if (Array.isArray(sched?.installmentSchedule) && sched.installmentSchedule.length > 0) {
        rawSlots = sched.installmentSchedule;
      }
    } catch { /* ignore */ }
  }

  let slots: any[] = [];

  if (rawSlots.length > 0) {
    slots = rawSlots;
  } else if (hasInstallments && numInstallments > 1) {
    const base = Math.floor(totalDue / numInstallments);
    const extra = totalDue - base * numInstallments;
    const invDue = parseISO(invoiceDueDate ?? "");
    const baseDate = isValid(invDue) ? invDue : new Date();

    slots = Array.from({ length: numInstallments }, (_, i) => {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() + i);
      return {
        number: i + 1,
        amount: i === 0 ? base + extra : base,
        dueDate: format(date, "yyyy-MM-dd"),
      };
    });
  } else {
    slots = [
      {
        number: 1,
        amount: totalDue,
        dueDate: invoiceDueDate || format(new Date(), "yyyy-MM-dd"),
      },
    ];
  }

  // Calculate sum of slots to check if initial payment was deducted before schedule
  const slotsSum = slots.reduce((acc: number, s: any) => acc + (parseFloat(s.amount) || 0), 0);

  let initialPaid = 0;
  if (slotsSum > 0 && slotsSum < totalDue) {
    initialPaid = totalDue - slotsSum;
  } else if (schedAmountPaid > 0 && schedAmountPaid < totalDue) {
    initialPaid = schedAmountPaid;
  }

  // Payments allocated to installment slots AFTER initial payment
  let remainingPaidPool = Math.max(0, totalPaid - initialPaid);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return slots.map((s: any, idx: number) => {
    const instAmount = parseFloat(s.amount) || 0;
    let paidAmount = 0;
    let isPaid = false;
    let isPartial = false;

    if (remainingPaidPool >= instAmount && instAmount > 0) {
      paidAmount = instAmount;
      remainingPaidPool -= instAmount;
      isPaid = true;
    } else if (remainingPaidPool > 0) {
      paidAmount = remainingPaidPool;
      remainingPaidPool = 0;
      isPartial = true;
    }

    const dStr = s.dueDate ?? s.due_date ?? invoiceDueDate ?? "";
    const dParsed = parseISO(dStr);
    const isOverdue = !isPaid && isValid(dParsed) && dParsed < today;

    const statusKey = isPaid ? "paid" : isPartial ? "partial" : isOverdue ? "overdue" : "due";

    return {
      label: `Installment ${s.number ?? idx + 1}`,
      number: s.number ?? idx + 1,
      amount: instAmount,
      dueDate: dStr,
      paid: isPaid,
      partial: isPartial,
      overdue: isOverdue,
      paidAmount,
      instRemaining: Math.max(0, instAmount - paidAmount),
      statusKey,
    };
  });
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const [activeTab,       setActiveTab]       = useState<Tab>("summary");
  const [invoice,         setInvoice]         = useState<any>(null);
  const [payments,        setPayments]        = useState<any[]>([]);
  const [installments,    setInstallments]    = useState<InstallmentSlot[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);

  // Payment Modal
  const [payModal,        setPayModal]        = useState<{ open: boolean; amount: string; installmentLabel?: string }>({ open: false, amount: "" });
  const [payMode,         setPayMode]         = useState("upi");
  const [payRef,          setPayRef]          = useState("");
  const [payNote,         setPayNote]         = useState("");
  const [submitting,      setSubmitting]      = useState(false);

  function safeFormat(dateStr: string) {
    if (!dateStr) return "—";
    try {
      const d = parseISO(String(dateStr));
      return isValid(d) ? format(d, "dd MMM yyyy") : "—";
    } catch { return "—"; }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch invoice by scanning list (backend enriches with installment schedule from admission)
      const [invRes, payRes] = await Promise.all([
        fetch(`${API}/fees/invoices`, { headers: authHeaders() }).catch(() => null),
        fetch(`${API}/fees/invoices/${id}/payments`, { headers: authHeaders() }).catch(() => null),
      ]);

      let found: any = null;
      if (invRes && invRes.ok) {
        const json = await invRes.json();
        const list: any[] = Array.isArray(json) ? json : (json.data ?? []);
        found = list.find((i: any) => i.id === id);
        if (!found) throw new Error("Invoice not found");
        setInvoice(found);
      } else {
        throw new Error("Failed to load invoice");
      }

      // Fetch payments
      if (payRes && payRes.ok) {
        const payJson = await payRes.json();
        setPayments(Array.isArray(payJson) ? payJson : (payJson.data ?? []));
      }

      const totalDue  = parseFloat(found.amount_due)  || 0;
      const totalPaid = parseFloat(found.amount_paid) || 0;
      const dueDate   = found.due_date ?? "";

      const reconciled = resolveInstallments(
        totalDue,
        totalPaid,
        dueDate,
        found.payment_installment_schedule
      );

      setInstallments(reconciled);

    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function openPayModal(amount: number, label?: string) {
    setPayModal({ open: true, amount: String(amount), installmentLabel: label });
    setPayMode("upi");
    setPayRef("");
    setPayNote("");
  }

  function closePayModal() {
    setPayModal({ open: false, amount: "" });
  }

  async function handlePayment() {
    const amount = parseFloat(payModal.amount);
    const invAmountDue  = parseFloat(invoice?.amount_due)  || 0;
    const invAmountPaid = parseFloat(invoice?.amount_paid) || 0;
    const outstanding   = Math.max(0, invAmountDue - invAmountPaid);

    if (!payModal.amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (amount > outstanding) {
      toast.error(`Amount (₹${amount.toLocaleString("en-IN")}) exceeds outstanding ₹${outstanding.toLocaleString("en-IN")}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/fees/invoices/${id}/pay`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify({
          amount:          amount,
          payment_mode:    payMode,
          transaction_ref: payRef  || null,
          notes:           payNote || null,
        }),
      });
      if (!res.ok) throw new Error("Payment failed");
      toast.success("Payment recorded successfully!");
      closePayModal();
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="space-y-4 max-w-4xl">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );

  if (error || !invoice) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-muted-foreground">{error ?? "Invoice not found."}</p>
      <button onClick={() => router.push("/fees")} className="text-sm underline text-primary">
        ← Back to Fees
      </button>
    </div>
  );

  const amountDue   = parseFloat(invoice.amount_due)  || 0;
  const amountPaid  = parseFloat(invoice.amount_paid) || 0;
  const outstanding = Math.max(0, amountDue - amountPaid);
  const pct         = amountDue > 0 ? Math.min(100, Math.round((amountPaid / amountDue) * 100)) : 0;
  const invStatus   = invoice.status ?? "pending";
  const cfg         = STATUS_CONFIG[invStatus] ?? STATUS_CONFIG.pending;

  const studentName =
    (invoice.student_name ??
      `${invoice.student?.first_name ?? ""} ${invoice.student?.last_name ?? ""}`.trim()) || "—";

  const overdueCount = installments.filter(i => i.overdue).length;
  const nextUnpaid   = installments.find(i => !i.paid);

  const TABS: { id: Tab; label: string }[] = [
    { id: "summary",      label: "Summary"         },
    { id: "installments", label: "Installments"    },
    { id: "payments",     label: "Payment History" },
  ];

  return (
    <div className="space-y-5 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/fees")}
            className="mt-1 rounded-lg p-1.5 hover:bg-accent text-muted-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{invoice.invoice_no}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.className)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                {cfg.label}
              </span>
              <span className="text-sm text-muted-foreground font-medium">
                {studentName}{invoice.grade ? ` · ${invoice.grade}` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
            )}
          >
            {tab.label}
            {tab.id === "installments" && overdueCount > 0 && (
              <span className="rounded-full bg-red-500 text-white text-[10px] font-bold h-4 min-w-4 px-1 flex items-center justify-center">
                {overdueCount}
              </span>
            )}
            {tab.id === "payments" && payments.length > 0 && (
              <span className="rounded-full bg-muted text-muted-foreground text-[10px] font-medium h-4 min-w-4 px-1 flex items-center justify-center">
                {payments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Summary Tab ── */}
      {activeTab === "summary" && (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Invoice Details</h3>
            <div className="space-y-3">
              {[
                { label: "Invoice No",  value: invoice.invoice_no             },
                { label: "Due Date",    value: safeFormat(invoice.due_date)   },
                { label: "Created",     value: safeFormat(invoice.created_at) },
                { label: "Status",      value: cfg.label                      },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Fee Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Invoice Amount", value: `₹${amountDue.toLocaleString("en-IN")}`,   color: ""                 },
                { label: "Paid",           value: `₹${amountPaid.toLocaleString("en-IN")}`,  color: "text-emerald-600" },
                { label: "Outstanding",    value: `₹${outstanding.toLocaleString("en-IN")}`, color: outstanding > 0 ? "text-red-500" : "text-emerald-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn("font-bold text-base", color)}>{value}</span>
                </div>
              ))}

              <div className="pt-1 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span><span className="font-semibold text-foreground">{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-amber-500")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Installments Tab ── */}
      {activeTab === "installments" && (
        <div className="space-y-4">
          {/* Header with progress */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base">Installment Schedule</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {installments.filter(i => i.paid).length} of {installments.length} installments paid
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="font-bold text-primary text-lg">{pct}% Cleared</p>
              </div>
            </div>

            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", pct === 100 ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Summary strip */}
            <div className="flex flex-wrap gap-6 pt-1">
              <div>
                <p className="text-xs text-muted-foreground">Total Fee</p>
                <p className="font-bold text-sm font-mono">₹{amountDue.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-bold text-sm font-mono text-emerald-600">₹{amountPaid.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="font-bold text-sm font-mono text-red-500">₹{outstanding.toLocaleString("en-IN")}</p>
              </div>
              {nextUnpaid?.dueDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Next Due Date</p>
                  <p className="font-bold text-sm">{safeFormat(nextUnpaid.dueDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Installment Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {installments.map((inst, idx) => {
              const remaining = Math.max(0, inst.amount - inst.paidAmount);
              const instPct   = inst.amount > 0 ? Math.min(100, Math.round((inst.paidAmount / inst.amount) * 100)) : 0;
              const cfg       = STATUS_CONFIG[inst.statusKey] ?? STATUS_CONFIG.pending;

              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition-all",
                    inst.paid    && "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800/50",
                    inst.partial && "border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-800/50",
                    inst.overdue && !inst.paid && !inst.partial && "border-red-200 bg-red-50/40 dark:bg-red-950/20 dark:border-red-800/50",
                    !inst.paid && !inst.partial && !inst.overdue && "border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {inst.label}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      cfg.className
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                      {cfg.label}
                    </span>
                  </div>

                  <div>
                    <p className="text-2xl font-bold font-mono">₹{inst.amount.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: <span className={cn("font-semibold", inst.overdue ? "text-red-500" : "text-foreground")}>{safeFormat(inst.dueDate)}</span>
                    </p>
                  </div>

                  {/* Progress bar per installment */}
                  {!inst.paid && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", inst.partial ? "bg-blue-500" : "bg-muted-foreground/20")}
                          style={{ width: `${instPct}%` }}
                        />
                      </div>
                      {inst.partial && (
                        <p className="text-xs text-muted-foreground">
                          ₹{inst.paidAmount.toLocaleString("en-IN")} paid · ₹{remaining.toLocaleString("en-IN")} remaining
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  {inst.paid ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Payment Complete
                    </div>
                  ) : outstanding > 0 ? (
                    <button
                      onClick={() => openPayModal(Math.min(remaining || inst.amount, outstanding), inst.label)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all shadow-sm",
                        inst.overdue
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : inst.partial
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      )}
                    >
                      <IndianRupee className="h-3.5 w-3.5" />
                      {inst.partial
                        ? `Complete — ₹${remaining.toLocaleString("en-IN")}`
                        : `Record ₹${inst.amount.toLocaleString("en-IN")}`}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payment History Tab ── */}
      {activeTab === "payments" && (
        payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 rounded-xl border border-dashed bg-card gap-2">
            <Clock className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">No payment records found</p>
            {outstanding > 0 && (
              <button
                onClick={() => setActiveTab("installments")}
                className="text-xs text-primary underline"
              >
                Go to Installments to record a payment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p: any, idx: number) => (
              <div key={p.id ?? idx} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-base font-mono text-emerald-600">
                        + ₹{parseFloat(p.amount).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {MODE_LABELS[p.payment_mode] ?? p.payment_mode} · {p.paid_at || p.created_at ? safeFormat(p.paid_at ?? p.created_at) : "—"}
                        {p.transaction_ref && ` · Ref: ${p.transaction_ref}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                </div>
                {p.notes && (
                  <p className="text-xs text-muted-foreground mt-2 ml-12 italic">"{p.notes}"</p>
                )}
              </div>
            ))}

            {outstanding > 0 && (
              <div className="rounded-xl border border-dashed bg-card/50 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">₹{outstanding.toLocaleString("en-IN")} still outstanding</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Click to record the next payment</p>
                </div>
                <button
                  onClick={() => setActiveTab("installments")}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  <IndianRupee className="h-3.5 w-3.5" />
                  Pay Now
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Payment Modal ── */}
      {payModal.open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closePayModal}
          />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] rounded-2xl border bg-background shadow-2xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold">Record Payment</h2>
              {payModal.installmentLabel && (
                <p className="text-xs text-muted-foreground mt-0.5">{payModal.installmentLabel}</p>
              )}
            </div>

            <div className="rounded-lg bg-muted/60 px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Outstanding Balance</span>
              <span className="font-bold text-base text-red-500 font-mono">₹{outstanding.toLocaleString("en-IN")}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Amount (₹)</label>
                <input
                  type="number"
                  value={payModal.amount}
                  onChange={e => setPayModal(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder={`Max ₹${outstanding.toLocaleString("en-IN")}`}
                  max={outstanding}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Payment Mode</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {Object.entries(MODE_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPayMode(val)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs font-semibold text-center transition-all",
                        payMode === val
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "hover:bg-accent"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reference / Transaction ID <span className="font-normal">(optional)</span></label>
                <input
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  placeholder="UPI ID, Cheque No., Bank ref..."
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Notes <span className="font-normal">(optional)</span></label>
                <input
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  placeholder="e.g. Partial payment for Term 2"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={closePayModal}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><IndianRupee className="h-4 w-4" /> Save Payment</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}