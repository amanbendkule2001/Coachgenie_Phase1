"use client";

import { useRef } from "react";
import { X, Printer, Download, GraduationCap, CheckCircle, Clock, FileText, Building2, Phone, Mail, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateInvoicePDF } from "@/lib/utils/generate-invoice-pdf";

export interface InvoicePDFData {
  invoiceNo: string;
  date: string;
  studentName: string;
  parentName?: string;
  phone?: string;
  email?: string;
  grade?: string;
  boardName?: string;
  batchName?: string;
  totalFee: number;
  feePaid: number;
  paymentMode?: string;
  status: "CONFIRMED" | "FEE_PENDING" | "PENDING_DOCS" | "FULL" | "PARTIAL" | "UNPAID" | string;
  installments?: Array<{
    number: number;
    amount: number;
    dueDate: string;
    paid: boolean;
  }>;
  paymentHistory?: Array<{
    date: string;
    mode: string;
    amount: number;
    reference?: string;
  }>;
}

interface InvoicePDFModalProps {
  data: InvoicePDFData;
  onClose: () => void;
  instituteCode?: string;
  instituteName?: string;
}

export function InvoicePDFModal({
  data,
  onClose,
  instituteCode = "DEMO",
  instituteName = "CoachGenie Academy",
}: InvoicePDFModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const remaining = Math.max(0, data.totalFee - data.feePaid);

  function handleDownloadPDF() {
    generateInvoicePDF(data, { instituteName, instituteCode });
  }

  function handlePrint() {
    window.print();
  }

  const isFullyPaid = remaining === 0 || data.status === "CONFIRMED" || data.status === "FULL";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs print:hidden" onClick={onClose} />

      {/* Modal Container */}
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border bg-background shadow-2xl print:static print:translate-x-0 print:translate-y-0 print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between border-b px-6 py-3.5 bg-muted/30 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <span className="font-bold text-sm">Official Tuition Fee Invoice &amp; Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-sm"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="overflow-y-auto p-8 flex-1 space-y-6 print:overflow-visible print:p-0" ref={printRef}>
          
          {/* Header & Institute Logo */}
          <div className="flex items-start justify-between border-b pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 text-violet-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold shadow-md">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-foreground">{instituteName}</h1>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Institute Code: {instituteCode} · Admission &amp; Billing Desk
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 text-xs font-extrabold rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-300/40">
                INVOICE RECEIPT
              </span>
              <p className="text-sm font-bold text-foreground">#{data.invoiceNo}</p>
              <p className="text-xs text-muted-foreground">Date: {data.date}</p>
            </div>
          </div>

          {/* Status & Highlights */}
          <div className="grid grid-cols-3 gap-4 rounded-xl border bg-muted/20 p-4">
            <div>
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Total Course Fee</span>
              <p className="text-lg font-extrabold text-foreground">₹{data.totalFee.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Amount Paid to Date</span>
              <p className="text-lg font-extrabold text-emerald-600">₹{data.feePaid.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Balance Outstanding</span>
              <p className={cn("text-lg font-extrabold", remaining > 0 ? "text-amber-600" : "text-emerald-600")}>
                ₹{remaining.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Student & Parent Info Section */}
          <div className="grid grid-cols-2 gap-6 rounded-xl border p-4 bg-card">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Billed To (Student Details)
              </h3>
              <p className="font-bold text-sm text-foreground">{data.studentName}</p>
              <p className="text-xs text-muted-foreground">
                Grade: <span className="font-medium text-foreground">{data.grade || "N/A"}</span> · Board:{" "}
                <span className="font-medium text-foreground">{data.boardName || "N/A"}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Batch Allocation: <span className="font-medium text-foreground">{data.batchName || "Standard Batch"}</span>
              </p>
              {data.phone && <p className="text-xs text-muted-foreground">Phone: {data.phone}</p>}
              {data.email && <p className="text-xs text-muted-foreground">Email: {data.email}</p>}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                Guardian &amp; Payment Context
              </h3>
              <p className="font-bold text-sm text-foreground">{data.parentName || "Parent / Guardian"}</p>
              <p className="text-xs text-muted-foreground">
                Payment Channel: <span className="font-semibold text-foreground uppercase">{data.paymentMode || "UPI / Bank"}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Payment Status:{" "}
                <span className={cn("font-bold px-2 py-0.5 rounded text-[11px]", isFullyPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                  {isFullyPaid ? "FULLY PAID / CONFIRMED" : "PARTIAL / FEE PENDING"}
                </span>
              </p>
            </div>
          </div>

          {/* Payment Receipts & Transaction Table */}
          {data.paymentHistory && data.paymentHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Receipts &amp; Ledger Transactions
              </h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 font-semibold border-b">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Channel / Mode</th>
                      <th className="p-2.5">Reference ID</th>
                      <th className="p-2.5 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.paymentHistory.map((ph, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{ph.date}</td>
                        <td className="p-2.5 uppercase font-semibold text-violet-600">{ph.mode}</td>
                        <td className="p-2.5 font-mono text-muted-foreground">{ph.reference || `TXN-${idx + 101}`}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">₹{ph.amount.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Installment Breakdown Table */}
          {data.installments && data.installments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Adjustable Installment Schedule Breakdown
              </h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 font-semibold border-b">
                    <tr>
                      <th className="p-2.5">Installment #</th>
                      <th className="p-2.5">Due Date</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Installment Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.installments.map((inst) => (
                      <tr key={inst.number} className={cn("hover:bg-muted/20", inst.paid && "bg-emerald-500/5")}>
                        <td className="p-2.5 font-bold">Installment #{inst.number}</td>
                        <td className="p-2.5 font-medium">{inst.dueDate || "—"}</td>
                        <td className="p-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase",
                              inst.paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}
                          >
                            {inst.paid ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {inst.paid ? "Paid" : "Pending"}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground">
                          ₹{inst.amount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer & Signature Section */}
          <div className="pt-6 border-t flex items-end justify-between text-xs text-muted-foreground">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Authorized Computer Generated Receipt
              </div>
              <p>Thank you for choosing {instituteName}. For queries contact billing desk.</p>
            </div>

            <div className="text-center space-y-8">
              <div className="h-10 border-b border-dashed border-muted-foreground/40 w-40" />
              <p className="font-semibold text-foreground">Authorized Signatory &amp; Stamp</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default InvoicePDFModal;
