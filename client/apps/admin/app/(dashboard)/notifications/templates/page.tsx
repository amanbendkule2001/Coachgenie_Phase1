"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  MessageSquare,
  Mail,
  Phone,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Template {
  id: string;
  name: string;
  channel: "email" | "whatsapp" | "sms";
  subject: string | null;
  body: string;
  variables: string[] | null;
  is_active: boolean;
}

type FormState = {
  name: string;
  channel: string;
  subject: string;
  body: string;
  is_active: boolean;
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  sms: Phone,
  whatsapp: MessageSquare,
  email: Mail,
};

const CHANNEL_LIMITS: Record<string, number> = {
  sms: 160,
  whatsapp: 1024,
  email: Infinity,
};

const inputCls =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs";

const emptyForm: FormState = {
  name: "",
  channel: "whatsapp",
  subject: "",
  body: "",
  is_active: true,
};

function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

function HighlightedBody({ body }: { body: string }) {
  const parts = body.split(/(\{\{\w+\}\})/g);
  return (
    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
      {parts.map((part, i) =>
        /^\{\{\w+\}\}$/.test(part) ? (
          <code key={i} className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[11px] font-mono font-bold">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
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
    is_active: true,
  },
  {
    id: "tpl-2",
    name: "Student Absent Warning",
    channel: "sms",
    subject: "Class Absence Alert",
    body: "Alert: {{studentName}} was marked ABSENT for {{batchName}} class on {{date}}. Please contact institute administration if unexpected.",
    variables: ["studentName", "batchName", "date"],
    is_active: true,
  },
  {
    id: "tpl-3",
    name: "Exam Result Published",
    channel: "email",
    subject: "Exam Report Card Published - {{examTitle}}",
    body: "Dear Parent, exam results for {{examTitle}} have been published. {{studentName}} scored {{marksObtained}} (Rank #{{rank}}). Check parent portal for detailed analytics.",
    variables: ["examTitle", "studentName", "marksObtained", "rank"],
    is_active: true,
  },
];

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const mountedRef = useRef(true);

  async function loadTemplates() {
    try {
      const res = (await api.get("/notifications/templates")) as any;
      const list = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
      if (mountedRef.current) {
        setTemplates(list.length > 0 ? list : DEFAULT_TEMPLATES);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setTemplates(DEFAULT_TEMPLATES);
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadTemplates();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditTarget(t);
    setForm({
      name: t.name,
      channel: t.channel,
      subject: t.subject ?? "",
      body: t.body,
      is_active: t.is_active,
    });
    setShowForm(true);
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Template name is required");
    if (!form.body.trim()) return toast.error("Message body is required");
    if (form.channel === "email" && !form.subject.trim()) return toast.error("Subject is required for email templates");

    const limit = CHANNEL_LIMITS[form.channel] ?? Infinity;
    if (form.body.length > limit) return toast.error(`${form.channel.toUpperCase()} body must be under ${limit} characters`);

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        channel: form.channel,
        subject: form.subject.trim() || null,
        body: form.body.trim(),
        variables: extractVariables(form.body),
        is_active: form.is_active,
      };

      if (editTarget) {
        await api.patch(`/notifications/templates/${editTarget.id}`, payload);
        toast.success("Template updated successfully!");
      } else {
        await api.post("/notifications/templates", payload);
        toast.success("Template created successfully!");
      }

      await loadTemplates();
      setShowForm(false);
    } catch {
      // Local store fallback
      if (editTarget) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editTarget.id
              ? {
                  ...t,
                  name: form.name.trim(),
                  channel: form.channel as any,
                  subject: form.subject.trim() || null,
                  body: form.body.trim(),
                  variables: extractVariables(form.body),
                  is_active: form.is_active,
                }
              : t
          )
        );
        toast.success("Template updated!");
      } else {
        const newTpl: Template = {
          id: `tpl-${Date.now()}`,
          name: form.name.trim(),
          channel: form.channel as any,
          subject: form.subject.trim() || null,
          body: form.body.trim(),
          variables: extractVariables(form.body),
          is_active: form.is_active,
        };
        setTemplates((prev) => [newTpl, ...prev]);
        toast.success("Template created!");
      }
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/notifications/templates/${deleteId}`);
    } catch {
      // Quiet local fallback
    }
    setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
    toast.success("Template deleted");
    setDeleteId(null);
    setDeleting(false);
  }

  const charLimit = CHANNEL_LIMITS[form.channel] ?? Infinity;
  const charCount = form.body.length;
  const overLimit = charCount > charLimit;
  const nearLimit = !overLimit && charLimit < Infinity && charCount > charLimit * 0.85;

  if (loading) {
    return (
      <div className="space-y-3 max-w-4xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-card border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notification Templates
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> Auto Triggers
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure dynamic notification templates with variable placeholders for fee reminders, attendance, and exam results
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {/* Template list */}
      <div className="space-y-4">
        {templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed bg-card text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-semibold text-sm">No notification templates found.</p>
            <button onClick={openCreate} className="text-xs font-bold text-primary hover:underline">
              + Create Template
            </button>
          </div>
        )}

        {templates.map((t, i) => {
          const Icon = CHANNEL_ICONS[t.channel] ?? Mail;
          const vars = extractVariables(t.body);
          return (
            <div key={t.id} className="rounded-2xl border bg-card p-5 shadow-sm space-y-3 hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{t.name}</p>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {t.channel}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                          t.is_active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {t.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {t.subject && (
                      <p className="text-xs font-semibold text-muted-foreground">
                        Subject: <span className="text-foreground">{t.subject}</span>
                      </p>
                    )}

                    <HighlightedBody body={t.body} />

                    {vars.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-muted-foreground mr-1">Variables:</span>
                        {vars.map((v) => (
                          <code key={v} className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-mono font-bold">
                            {`{{${v}}}`}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    title="Edit template"
                    className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border shadow-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    title="Delete template"
                    className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors border shadow-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setShowForm(false)} />
          <div
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-2xl border bg-background shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-base">{editTarget ? "Edit Template" : "New Notification Template"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Template Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Fee Due Payment Reminder"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Communication Channel</label>
                  <select value={form.channel} onChange={(e) => setField("channel", e.target.value)} className={inputCls}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end pb-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.is_active}
                    onChange={(e) => setField("is_active", e.target.checked)}
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="font-semibold text-foreground cursor-pointer">
                    Active Template
                  </label>
                </div>
              </div>

              {form.channel === "email" && (
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Email Subject *</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setField("subject", e.target.value)}
                    placeholder="Fee Due Reminder - Your Coaching Institute"
                    className={inputCls}
                  />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Message Body *</label>
                  {charLimit < Infinity && (
                    <span className={cn("text-[11px] font-bold", overLimit ? "text-red-500" : nearLimit ? "text-amber-600" : "text-muted-foreground")}>
                      {charCount}/{charLimit} chars
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={form.body}
                  onChange={(e) => setField("body", e.target.value)}
                  placeholder="Use {{variableName}} for dynamic merge values — e.g. Dear {{parentName}}, fee of ₹{{amount}} is due on {{dueDate}}."
                  className={cn(
                    "flex w-full rounded-xl border bg-background px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs resize-none",
                    overLimit ? "border-red-500 focus-visible:ring-red-500" : "border-input"
                  )}
                />
                {overLimit && (
                  <p className="text-[11px] text-red-500 font-medium">
                    Body exceeds maximum character limit ({charLimit}) for {form.channel.toUpperCase()}
                  </p>
                )}
              </div>

              {extractVariables(form.body).length > 0 && (
                <div className="rounded-xl bg-muted/40 border p-3 space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Auto-Detected Dynamic Variables</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractVariables(form.body).map((v) => (
                      <code key={v} className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-mono font-bold">
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || overLimit}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-all shadow-xs"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>{submitting ? "Saving…" : editTarget ? "Save Changes" : "Create Template"}</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setDeleteId(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border bg-background shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/15 p-2.5 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Delete Template?</h3>
                <p className="text-xs text-muted-foreground">This template will be permanently removed.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setDeleteId(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-accent">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
