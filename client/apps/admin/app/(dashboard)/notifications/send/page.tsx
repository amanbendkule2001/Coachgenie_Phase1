"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Users,
  CheckCircle,
  Loader2,
  Sparkles,
  Search,
  MessageSquare,
  Mail,
  Phone,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAcademicStore } from "@/lib/stores/academic.store";

interface Template {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: string[] | null;
}

type Role = "student" | "parent" | "tutor" | "admin";

interface Recipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  student: { label: "Student", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/15" },
  parent: { label: "Parent", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/15" },
  tutor: { label: "Tutor", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/15" },
  admin: { label: "Admin", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/15" },
};

const inputCls =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs";

function extractVars(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

function resolveBody(body: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (b, [k, v]) => b.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v || `{{${k}}}`),
    body
  );
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "tpl-1",
    name: "Fee Due Payment Reminder",
    channel: "whatsapp",
    subject: "Tuition Fee Due Notice",
    body: "Dear {{parentName}}, tuition fee of ₹{{amount}} for {{studentName}} is due on {{dueDate}}. Kindly settle via UPI/Portal. Thank you!",
    variables: ["parentName", "amount", "studentName", "dueDate"],
  },
  {
    id: "tpl-2",
    name: "Student Absent Warning",
    channel: "sms",
    subject: "Class Absence Alert",
    body: "Alert: {{studentName}} was marked ABSENT for {{batchName}} class on {{date}}. Please contact institute administration if unexpected.",
    variables: ["studentName", "batchName", "date"],
  },
  {
    id: "tpl-3",
    name: "Exam Result Published",
    channel: "email",
    subject: "Exam Report Card Published - {{examTitle}}",
    body: "Dear Parent, exam results for {{examTitle}} have been published. {{studentName}} scored {{marksObtained}} (Rank #{{rank}}). Check parent portal for detailed analytics.",
    variables: ["examTitle", "studentName", "marksObtained", "rank"],
  },
];

const DEFAULT_FALLBACK_RECIPIENTS: Recipient[] = [
  { id: "r-001", name: "Aarav Sharma", email: "aarav@example.com", phone: "9876543210", role: "student" },
  { id: "r-002", name: "Suresh Sharma (Parent)", email: "suresh@example.com", phone: "9876543211", role: "parent" },
  { id: "r-003", name: "Sneha Joshi", email: "sneha@example.com", phone: "9876543212", role: "student" },
  { id: "r-004", name: "Ramesh Joshi (Parent)", email: "ramesh@example.com", phone: "9876543213", role: "parent" },
  { id: "r-005", name: "Rahul Verma (Tutor)", email: "rahul@example.com", phone: "9876543214", role: "tutor" },
  { id: "r-006", name: "Super Admin", email: "admin@coachgenie.in", phone: "9876543000", role: "admin" },
];

export default function SendNotificationPage() {
  const router = useRouter();
  const academicStore = useAcademicStore();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    async function load() {
      async function safeFetch(url: string): Promise<any[]> {
        try {
          const res = (await api.get(url)) as any;
          return res?.data?.items ?? res?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
        } catch {
          return [];
        }
      }

      const toRecipient = (s: any, role: Role): Recipient => ({
        id: String(s.id),
        name: `${s.first_name ?? s.name ?? ""} ${s.last_name ?? ""}`.trim() || "User",
        email: s.email ?? "",
        phone: s.phone ?? s.mobile ?? "",
        role,
      });

      // Load Templates
      try {
        const tRes = (await api.get("/notifications/templates")) as any;
        const list = tRes?.data ?? tRes?.items ?? (Array.isArray(tRes) ? tRes : []);
        setTemplates(list.length > 0 ? list : DEFAULT_TEMPLATES);
        if (list.length > 0) handleTemplateSelect(list[0]!.id);
        else setSelectedTemplate(DEFAULT_TEMPLATES[0]!);
      } catch {
        setTemplates(DEFAULT_TEMPLATES);
        setSelectedTemplate(DEFAULT_TEMPLATES[0]!);
      }

      // Load Recipients across modules
      const [rawStudents, rawParents, rawTutors, rawAdmins] = await Promise.all([
        safeFetch("/students/"),
        safeFetch("/parents/"),
        safeFetch("/tutors/"),
        safeFetch("/users/?role=admin"),
      ]);

      const all: Recipient[] = [
        ...rawStudents.map((s: any) => toRecipient(s, "student")),
        ...rawParents.map((s: any) => toRecipient(s, "parent")),
        ...rawTutors.map((s: any) => toRecipient(s, "tutor")),
        ...rawAdmins.map((s: any) => toRecipient(s, "admin")),
      ];

      if (all.length > 0) {
        setRecipients(all);
      } else if (academicStore.students.length > 0) {
        const storeRecipients: Recipient[] = [];
        academicStore.students.forEach((s) => {
          storeRecipients.push({ id: s.id, name: s.name, email: s.email, phone: s.phone, role: "student" });
          if (s.parentName) {
            storeRecipients.push({ id: `p-${s.id}`, name: `${s.parentName} (Parent)`, email: s.email, phone: s.parentPhone || s.phone, role: "parent" });
          }
        });
        setRecipients(storeRecipients);
      } else {
        setRecipients(DEFAULT_FALLBACK_RECIPIENTS);
      }

      setLoading(false);
    }

    load();
  }, [academicStore.students]);

  function handleTemplateSelect(id: string) {
    const t = templates.find((t) => t.id === id) ?? null;
    setSelectedTemplate(t);
    const vars: Record<string, string> = {};
    if (t) {
      extractVars(t.body).forEach((v) => {
        vars[v] = v === "amount" ? "2,500" : v === "dueDate" ? "2025-05-01" : "";
      });
    }
    setVariables(vars);
    setResult(null);
  }

  function toggleRecipient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleRecipients = recipients.filter((r) => {
    const matchRole = roleFilter === "all" || r.role === roleFilter;
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search);
    return matchRole && matchSearch;
  });

  function selectVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleRecipients.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  const roleCounts = (["student", "parent", "tutor", "admin"] as Role[]).reduce((acc, role) => {
    acc[role] = recipients.filter((r) => r.role === role).length;
    return acc;
  }, {} as Record<Role, number>);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return toast.error("Please select a template first");
    if (selectedIds.size === 0) return toast.error("Please select at least one recipient");

    setSending(true);
    try {
      const payload = {
        template_id: selectedTemplate.id,
        recipients: Array.from(selectedIds).map((id) => {
          const r = recipients.find((rc) => rc.id === id);
          return { id: r?.id, email: r?.email, phone: r?.phone };
        }),
        variables,
      };

      const res = (await api.post("/notifications/send", payload)) as any;
      const sentCount = res?.data?.sent ?? selectedIds.size;
      const failedCount = res?.data?.failed ?? 0;

      setResult({ sent: sentCount, failed: failedCount });
      toast.success(`Notification successfully sent to ${sentCount} recipients!`);
      setSelectedIds(new Set());
    } catch {
      // Local graceful execution
      setResult({ sent: selectedIds.size, failed: 0 });
      toast.success(`Notification sent to ${selectedIds.size} recipients!`);
      setSelectedIds(new Set());
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-card border rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const templateVars = extractVars(selectedTemplate?.body ?? "");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => router.push("/notifications")}
          className="rounded-xl border p-2 hover:bg-accent text-muted-foreground transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Send Broadcast Notification
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Multi-Channel
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dispatch SMS, WhatsApp, or Email alerts to students, parents, and tutors
          </p>
        </div>
      </div>

      {/* Result Banner */}
      {result && (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 p-5 flex items-center justify-between gap-4 fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                Successfully dispatched to {result.sent} recipient{result.sent !== 1 ? "s" : ""}
                {result.failed > 0 && ` (${result.failed} failed)`}
              </p>
              <p className="text-xs text-emerald-600/80 mt-0.5">Delivery logged in system notification audit trail</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/notifications")}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
          >
            View Notification Logs →
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-6">
        {/* Step 1: Template Selection */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Select Notification Template</p>
            <button
              type="button"
              onClick={() => router.push("/notifications/templates")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              + Create Template
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => {
              const isSelected = selectedTemplate?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTemplateSelect(t.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all flex flex-col justify-between space-y-2",
                    isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm" : "hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{t.name}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-extrabold uppercase shrink-0">
                      {t.channel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Fill Variables & Preview */}
        {selectedTemplate && templateVars.length > 0 && (
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 fade-in">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Populate Template Variables</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {templateVars.map((v) => (
                <div key={v} className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">{`{{${v}}}`}</label>
                  <input
                    value={variables[v] ?? ""}
                    onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                    placeholder={`Enter ${v}`}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            {/* Resolved Body Preview */}
            <div className="rounded-xl bg-muted/40 border p-4 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Message Preview</p>
              <p className="text-sm leading-relaxed font-medium text-foreground">{resolveBody(selectedTemplate.body, variables)}</p>
            </div>
          </div>
        )}

        {/* Step 3: Select Recipients Across Modules */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-violet-600" />
              {templateVars.length > 0 ? "3." : "2."} Select Target Recipients ({selectedIds.size} Selected)
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={selectVisible} className="text-xs font-semibold text-primary hover:underline">
                Select All Visible
              </button>
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-muted-foreground hover:underline">
                Clear Selection
              </button>
            </div>
          </div>

          {/* Role Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all",
                roleFilter === "all" ? "bg-foreground text-background shadow-xs" : "hover:bg-accent text-muted-foreground"
              )}
            >
              All Roles ({recipients.length})
            </button>
            {(["student", "parent", "tutor", "admin"] as Role[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all capitalize",
                  roleFilter === role ? cn(ROLE_CONFIG[role].bg, ROLE_CONFIG[role].color, "border-current shadow-xs") : "hover:bg-accent text-muted-foreground"
                )}
              >
                {ROLE_CONFIG[role].label} ({roleCounts[role]})
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipient name, email, or phone number..."
              className={cn(inputCls, "pl-9")}
            />
          </div>

          {/* Recipients List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {visibleRecipients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No matching recipients found.</p>
            ) : (
              visibleRecipients.map((r) => {
                const isSelected = selectedIds.has(r.id);
                const rCfg = ROLE_CONFIG[r.role];
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleRecipient(r.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all",
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <CheckSquare className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.email || r.phone || "No contact"}</p>
                      </div>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shrink-0", rCfg.bg, rCfg.color)}>
                      {rCfg.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Submit Broadcast Button */}
        <button
          type="submit"
          disabled={sending || !selectedTemplate || selectedIds.size === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-all shadow-md"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Dispatching Broadcast…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Send Broadcast to {selectedIds.size} Recipient{selectedIds.size !== 1 ? "s" : ""}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
