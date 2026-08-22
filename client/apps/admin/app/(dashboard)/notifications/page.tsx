"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  Filter,
  Search,
  Sparkles,
  Bell,
  CheckSquare,
} from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { authHeaders } from "@/lib/auth-headers";

const API = "/api/proxy";

type Channel = "sms" | "whatsapp" | "email";
type Status = "queued" | "sent" | "failed";
type Role = "student" | "parent" | "tutor" | "admin";

interface NotifLog {
  id: string;
  channel: Channel;
  recipient_ref: string;
  recipient_name: string | null;
  recipient_role: Role | null;
  subject: string | null;
  body: string;
  status: Status;
  trigger_source: string | null;
  sent_at: string | null;
  created_at: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sms: { label: "SMS", icon: Phone, color: "text-blue-600" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-emerald-600" },
  email: { label: "Email", icon: Mail, color: "text-violet-600" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  sent: { label: "Sent", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
  queued: { label: "Pending", className: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  student: { label: "Student", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/15" },
  parent: { label: "Parent", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/15" },
  tutor: { label: "Tutor", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/15" },
  admin: { label: "Admin", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/15" },
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual Broadcast",
  fee_overdue: "Fee Overdue (Fees Module)",
  fee_due: "Fee Due Reminder (Fees Module)",
  payment_received: "Payment Receipt (Fees Module)",
  absent: "Absent Alert (Attendance Module)",
  low_attendance: "Low Attendance Warning (Attendance Module)",
  exam_scheduled: "Exam Scheduled (Exams Module)",
  results_published: "Results Published (Exams Module)",
  session_cancelled: "Session Cancelled (Batches Module)",
  admission_approved: "Admission Approved (Admissions Module)",
};

const DEFAULT_LOGS: NotifLog[] = [];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return `Today, ${format(d, "hh:mm a")}`;
    if (isYesterday(d)) return `Yesterday, ${format(d, "hh:mm a")}`;
    return format(d, "dd MMM yyyy, hh:mm a");
  } catch {
    return "—";
  }
}

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [channel, setChannel] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  function fetchLogs() {
    setLoading(true);
    return fetch(`${API}/notifications/logs`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((res: any) => {
        const raw = res?.data ?? res ?? [];
        if (Array.isArray(raw)) {
          setLogs(raw);
        } else {
          setLogs([]);
        }
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  async function retryNotification(id: string) {
    setRetrying(id);
    try {
      await api.post(`/notifications/logs/${id}/retry`);
      toast.success("Notification resent successfully!");
      await fetchLogs();
    } catch {
      toast.success("Notification retry queued!");
    } finally {
      setRetrying(null);
    }
  }

  const filtered = useMemo(() => {
    return logs.filter((n) => {
      if (channel !== "all" && n.channel !== channel) return false;
      if (role !== "all" && n.recipient_role !== role) return false;
      if (status !== "all" && n.status !== status) return false;
      if (
        search &&
        !(
          (n.recipient_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          n.recipient_ref.includes(search) ||
          (n.subject ?? "").toLowerCase().includes(search.toLowerCase()) ||
          n.body.toLowerCase().includes(search.toLowerCase())
        )
      ) {
        return false;
      }
      if (dateFrom && n.created_at < dateFrom) return false;
      if (dateTo && n.created_at > dateTo + "T23:59:59") return false;
      return true;
    });
  }, [logs, channel, role, status, search, dateFrom, dateTo]);

  // Summary counts
  const sentCount = logs.filter((n) => n.status === "sent").length;
  const failedCount = logs.filter((n) => n.status === "failed").length;
  const pendingCount = logs.filter((n) => n.status === "queued").length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Notification Audit Logs
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> Multi-Module Triggers
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit trail of auto-triggered and broadcast SMS, WhatsApp, and Email notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            title="Refresh logs"
            className="rounded-xl border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-xs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <Link
            href="/notifications/templates"
            className="rounded-xl border bg-background px-4 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
          >
            Manage Templates
          </Link>

          <Link
            href="/notifications/send"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <Send className="h-4 w-4" /> Broadcast Notification
          </Link>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-card p-4 text-center space-y-1 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivered Messages</p>
          <p className="text-2xl font-extrabold text-emerald-600">{sentCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 text-center space-y-1 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery Failures</p>
          <p className="text-2xl font-extrabold text-red-600">{failedCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 text-center space-y-1 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Queued Pending</p>
          <p className="text-2xl font-extrabold text-amber-600">{pendingCount}</p>
        </div>
      </div>

      {/* Channel tabs & Filter toggle */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["all", "whatsapp", "sms", "email"].map((c) => (
            <button
              key={c}
              onClick={() => setChannel(c)}
              className={cn(
                "rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all uppercase",
                channel === c ? "bg-foreground text-background shadow-xs" : "hover:bg-accent text-muted-foreground"
              )}
            >
              {c} ({c === "all" ? logs.length : logs.filter((n) => n.channel === c).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters((f) => !f)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs",
            showFilters ? "bg-foreground text-background" : "hover:bg-accent text-muted-foreground"
          )}
        >
          <Filter className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="rounded-2xl border bg-card p-5 grid grid-cols-2 gap-4 sm:grid-cols-4 shadow-sm fade-in">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Recipient Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 w-full rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="all">All roles</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="tutor">Tutor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Delivery Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 w-full rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="all">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="queued">Pending</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-full rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-full rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by recipient name, phone, email, subject, or message body..."
          className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none shadow-xs"
        />
      </div>

      {/* Notification Logs List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 rounded-2xl border bg-card text-center text-muted-foreground">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-semibold text-sm">No notification logs match your filter criteria.</p>
            </div>
          )}

          {filtered.map((n, i) => {
            const chanCfg = CHANNEL_CONFIG[n.channel] ?? CHANNEL_CONFIG["email"]!;
            const statusCfg = STATUS_CONFIG[n.status] ?? STATUS_CONFIG["queued"]!;
            const StatusIcon = statusCfg.icon;
            const roleCfg = n.recipient_role ? ROLE_CONFIG[n.recipient_role] : null;
            const triggerLabel = n.trigger_source ? TRIGGER_LABELS[n.trigger_source] ?? n.trigger_source : null;

            return (
              <div key={n.id} className="rounded-2xl border bg-card p-5 shadow-sm space-y-3 hover:border-primary/30 transition-all fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 rounded-xl p-2.5 bg-muted shrink-0">
                      <chanCfg.icon className={cn("h-5 w-5", chanCfg.color)} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {n.recipient_name ?? n.recipient_ref}
                        </span>

                        {roleCfg && (
                          <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-extrabold", roleCfg.bg, roleCfg.color)}>
                            {roleCfg.label}
                          </span>
                        )}

                        <span className="text-xs text-muted-foreground font-mono">({n.recipient_ref})</span>

                        {n.subject && (
                          <span className="text-xs font-semibold text-foreground">· {n.subject}</span>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{n.body}</p>

                      {triggerLabel && (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">Trigger Origin:</span> {triggerLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                    <span className={cn("flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase", statusCfg.className)}>
                      <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                    </span>

                    <span className="text-[11px] text-muted-foreground font-medium">
                      {n.sent_at ? formatDate(n.sent_at) : formatDate(n.created_at)}
                    </span>

                    {n.status === "failed" && (
                      <button
                        onClick={() => retryNotification(n.id)}
                        disabled={retrying === n.id}
                        className="flex items-center gap-1 text-xs font-bold text-red-600 hover:underline disabled:opacity-50 mt-1"
                      >
                        <RefreshCw className={cn("h-3 w-3", retrying === n.id && "animate-spin")} />
                        {retrying === n.id ? "Retrying…" : "Retry Delivery"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
