"use client";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Invoice, Payment, FeeStructure, InvoiceStatus,
  NotificationLog, NotificationTemplate, InstituteUser, PaymentMode,
} from "@/lib/types/finance";

// ── Seed Data ──────────────────────────────────────────────────
const SEED_FEE_STRUCTURES: FeeStructure[] = [];
const SEED_INVOICES: Invoice[] = [];
const SEED_NOTIFICATIONS: NotificationLog[] = [];
const SEED_TEMPLATES: NotificationTemplate[] = [];
const SEED_USERS: InstituteUser[] = [];

// ── Store ──────────────────────────────────────────────────────
interface FinanceStore {
  invoices:      Invoice[];
  feeStructures: FeeStructure[];
  notifications: NotificationLog[];
  templates:     NotificationTemplate[];
  users:         InstituteUser[];

  // Invoices
  addInvoice:    (inv: Omit<Invoice, "id" | "invoiceNo" | "createdAt" | "payments" | "paid" | "status">) => Invoice;
  recordPayment: (invoiceId: string, payment: Omit<Payment, "id">) => void;

  // Fee structures
  addFeeStructure:    (fs: Omit<FeeStructure, "id" | "createdAt">) => FeeStructure;
  updateFeeStructure: (id: string, patch: Partial<FeeStructure>) => void;
  deleteFeeStructure: (id: string) => void;

  // Notifications
  addNotification: (log: Omit<NotificationLog, "id">) => void;

  // Templates
  addTemplate:    (t: Omit<NotificationTemplate, "id" | "createdAt">) => NotificationTemplate;
  updateTemplate: (id: string, patch: Partial<NotificationTemplate>) => void;
  deleteTemplate: (id: string) => void;

  // Users
  inviteUser:     (u: Omit<InstituteUser, "id" | "joinedAt" | "status">) => void;
  updateUserRole: (id: string, role: InstituteUser["role"]) => void;
  deactivateUser: (id: string) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  immer((set) => ({
    invoices:      [],
    feeStructures: [],
    notifications: [],
    templates:     [],
    users:         [],

    addInvoice: (data) => {
      const count = SEED_INVOICES.length + 1;
      const inv: Invoice = {
        ...data,
        id:        `inv-${Date.now()}`,
        invoiceNo: `INV-${new Date().getFullYear()}-${String(count).padStart(3,"0")}`,
        createdAt: new Date().toISOString(),
        payments:  [],
        paid:      0,
        status:    "PENDING",
      };
      set(s => { s.invoices.unshift(inv); });
      return inv;
    },

    recordPayment: (invoiceId, payment) =>
      set(s => {
        const inv = s.invoices.find(i => i.id === invoiceId);
        if (!inv) return;
        inv.payments.push({ ...payment, id: `p-${Date.now()}` });
        inv.paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
        inv.status = inv.paid >= inv.amount ? "PAID"
          : inv.paid > 0 ? "PARTIAL"
          : new Date(inv.dueDate) < new Date() ? "OVERDUE"
          : "PENDING";
      }),

    addFeeStructure: (data) => {
      const fs: FeeStructure = { ...data, id: `fs-${Date.now()}`, createdAt: new Date().toISOString() };
      set(s => { s.feeStructures.unshift(fs); });
      return fs;
    },

    updateFeeStructure: (id, patch) =>
      set(s => {
        const i = s.feeStructures.findIndex(f => f.id === id);
        if (i !== -1) Object.assign(s.feeStructures[i]!, patch);
      }),

    deleteFeeStructure: (id) =>
      set(s => { s.feeStructures = s.feeStructures.filter(f => f.id !== id); }),

    addNotification: (log) =>
      set(s => { s.notifications.unshift({ ...log, id: `n-${Date.now()}` }); }),

    addTemplate: (data) => {
      const t: NotificationTemplate = { ...data, id: `tpl-${Date.now()}`, createdAt: new Date().toISOString() };
      set(s => { s.templates.unshift(t); });
      return t;
    },

    updateTemplate: (id, patch) =>
      set(s => {
        const i = s.templates.findIndex(t => t.id === id);
        if (i !== -1) Object.assign(s.templates[i]!, patch);
      }),

    deleteTemplate: (id) =>
      set(s => { s.templates = s.templates.filter(t => t.id !== id); }),

    inviteUser: (data) =>
      set(s => {
        s.users.push({ ...data, id: `u-${Date.now()}`, joinedAt: new Date().toISOString(), status: "INVITED" });
      }),

    updateUserRole: (id, role) =>
      set(s => {
        const u = s.users.find(x => x.id === id);
        if (u) u.role = role;
      }),

    deactivateUser: (id) =>
      set(s => {
        const u = s.users.find(x => x.id === id);
        if (u) u.status = "INACTIVE";
      }),
  }))
);
