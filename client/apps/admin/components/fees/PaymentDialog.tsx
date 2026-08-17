"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMode } from "@/lib/types/finance";

const schema = z.object({
  amount:    z.coerce.number().positive("Amount must be positive"),
  mode:      z.enum(["CASH","UPI","BANK_TRANSFER","CHEQUE","CARD"]),
  date:      z.string().min(1, "Date required"),
  reference: z.string().min(1, "Reference required"),
  note:      z.string().optional(),
});
export type PaymentFormValues = z.infer<typeof schema>;

const inputCls = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium">{label}</label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash", UPI: "UPI", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", CARD: "Card",
};

interface PaymentDialogProps {
  invoiceNo:   string;
  outstanding: number;
  onSubmit:    (data: PaymentFormValues) => Promise<void>;
  onClose:     () => void;
}

export function PaymentDialog({ invoiceNo, outstanding, onSubmit, onClose }: PaymentDialogProps) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:    outstanding,
      mode:      "UPI",
      date:      new Date().toISOString().split("T")[0],
      reference: "",
    },
  });

  const handleDevAutoFill = () => {
    const randUtr = Math.floor(100000000000 + Math.random() * 900000000000);
    setValue("amount", outstanding > 0 ? outstanding : 5000);
    setValue("mode", "UPI");
    setValue("date", new Date().toISOString().split("T")[0]);
    setValue("reference", `UPI-${randUtr}`);
    setValue("note", "Auto-filled payment entry for testing verification");
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="font-semibold">Record Payment</h2>
            <p className="text-sm text-muted-foreground">{invoiceNo} · Outstanding: ₹{outstanding.toLocaleString("en-IN")}</p>
          </div>
          <div className="flex items-center gap-2">
            {(process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_DEV_AUTOFILL === "true") && (
              <button
                type="button"
                onClick={handleDevAutoFill}
                title="Fill dummy payment data"
                className="flex items-center gap-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-md transition-colors"
              >
                <Zap className="h-3 w-3 fill-current" />
                <span>Auto-Fill</span>
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (₹)" error={errors.amount?.message}>
              <input {...register("amount")} type="number" className={inputCls} />
            </Field>
            <Field label="Payment Mode" error={errors.mode?.message}>
              <select {...register("mode")} className={inputCls}>
                {Object.entries(MODE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Date" error={errors.date?.message}>
              <input {...register("date")} type="date" className={inputCls} />
            </Field>
            <Field label="Reference / UTR No." error={errors.reference?.message}>
              <input {...register("reference")} placeholder="UPI-123456" className={inputCls} />
            </Field>
          </div>
          <Field label="Note (optional)" error={errors.note?.message}>
            <textarea {...register("note")} rows={2} placeholder="Any additional note…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </Field>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
