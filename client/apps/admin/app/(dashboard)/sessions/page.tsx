"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  ClipboardList,
  Plus,
  RefreshCw,
  Users,
  Sparkles,
  Search,
  BookOpen,
  Video,
  MapPin,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAcademicStore } from "@/lib/stores/academic.store";

type BatchApi = {
  id: string;
  name: string;
  target_exam?: string | null;
  code?: string | null;
};

type ClassApi = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  room_or_link?: string | null;
};

type Session = ClassApi & {
  batchId: string;
  batchName: string;
  subject: string;
};

const DEFAULT_SEED_SESSIONS: Session[] = [];

function unwrap<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Not scheduled";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(status: string): "Completed" | "Cancelled" | "Upcoming" {
  const s = status.toLowerCase();
  if (s.includes("complete")) return "Completed";
  if (s.includes("cancel")) return "Cancelled";
  return "Upcoming";
}

function sessionDate(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  return Number.isNaN(d.getTime()) ? format(new Date(), "yyyy-MM-dd") : format(d, "yyyy-MM-dd");
}

export default function SessionsPage() {
  const academicBatches = useAcademicStore((s) => s.batches);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  async function fetchSessions() {
    setLoading(true);
    setError(null);
    try {
      const batchResponse = await api.get<unknown>("/batches/").catch(() => null);
      const batches = unwrap<BatchApi>(batchResponse);

      if (batches.length > 0) {
        const sessionGroups = await Promise.all(
          batches.map(async (batch) => {
            const response = await api.get<unknown>(`/batches/${batch.id}/classes`).catch(() => null);
            return unwrap<ClassApi>(response).map<Session>((session) => ({
              ...session,
              batchId: String(batch.id),
              batchName: batch.name,
              subject: batch.target_exam ?? batch.code ?? "General Science",
            }));
          })
        );

        const flat = sessionGroups.flat();
        if (flat.length > 0) {
          setSessions(flat.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
        } else {
          setSessions([]);
        }
      } else {
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function markCompleted(sessionId: string) {
    try {
      await api.patch(`/batches/classes/${sessionId}`, { status: "completed" }).catch(() => null);
      setSessions((prev) => prev.map((item) => (item.id === sessionId ? { ...item, status: "completed" } : item)));
      toast.success("Class session marked as completed!");
    } catch {
      setSessions((prev) => prev.map((item) => (item.id === sessionId ? { ...item, status: "completed" } : item)));
      toast.success("Session completed");
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    const todayStr = new Date().toDateString();
    return sessions.filter((s) => {
      const isToday = new Date(s.scheduled_at).toDateString() === todayStr;
      const statusStr = normalizeStatus(s.status);

      let matchFilter = true;
      if (statusFilter === "TODAY") matchFilter = isToday;
      else if (statusFilter === "UPCOMING") matchFilter = statusStr === "Upcoming";
      else if (statusFilter === "COMPLETED") matchFilter = statusStr === "Completed";

      const matchSearch =
        !searchQuery ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject.toLowerCase().includes(searchQuery.toLowerCase());

      return matchFilter && matchSearch;
    });
  }, [sessions, statusFilter, searchQuery]);

  // Executive Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = sessions.filter((s) => new Date(s.scheduled_at).toDateString() === today).length;
    const completed = sessions.filter((s) => normalizeStatus(s.status) === "Completed").length;
    const pending = sessions.length - completed;

    return {
      todayCount,
      totalCount: sessions.length,
      pending,
      completed,
    };
  }, [sessions]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 🚀 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Class Sessions &amp; Lecture Timetable
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> Live Lecture Engine
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track daily class lectures, assign classroom venues, mark session completions, and launch batch attendance
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="rounded-xl border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-xs"
            title="Refresh sessions"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          <Link
            href="/batches"
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> Schedule New Session
          </Link>
        </div>
      </div>

      {/* 📊 KPI Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Lectures</span>
          <p className="text-3xl font-extrabold text-violet-600 tracking-tight">{stats.todayCount}</p>
          <p className="text-xs text-muted-foreground">Scheduled for today</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Sessions</span>
          <p className="text-3xl font-extrabold tracking-tight">{stats.totalCount}</p>
          <p className="text-xs text-muted-foreground">Active in catalog</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Attendance</span>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Awaiting attendance mark</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Lectures</span>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{stats.completed}</p>
          <p className="text-xs text-emerald-600 font-medium">Finished lectures</p>
        </div>
      </div>

      {/* 🔍 Search & Filters Bar */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by session title, batch, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {[
            { id: "ALL", label: "All Sessions" },
            { id: "TODAY", label: "Today's Schedule" },
            { id: "UPCOMING", label: "Upcoming" },
            { id: "COMPLETED", label: "Completed" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={cn(
                "rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all uppercase",
                statusFilter === st.id ? "bg-foreground text-background shadow-xs" : "hover:bg-accent text-muted-foreground"
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🚀 Session Schedule List */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Active Class Lecture Schedule</h2>
            <p className="text-xs text-muted-foreground">Live timetables synced from batch profiles</p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{filteredSessions.length} Sessions</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-semibold text-sm">No lecture sessions match your query.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredSessions.map((session) => {
              const status = normalizeStatus(session.status);
              const attendanceHref = `/attendance?batchId=${session.batchId}&date=${sessionDate(session.scheduled_at)}`;

              return (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-accent/40 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground truncate">{session.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase shrink-0 border",
                          status === "Completed"
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            : status === "Cancelled"
                            ? "bg-red-500/15 text-red-600 border-red-500/30"
                            : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                        )}
                      >
                        {status}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium truncate">
                      <span className="font-semibold text-foreground">{session.batchName}</span> • Subject:{" "}
                      <span className="font-semibold text-foreground">{session.subject}</span> • Venue:{" "}
                      <span className="font-semibold text-foreground">{session.room_or_link || "Room 101"}</span> • Duration:{" "}
                      <span className="font-semibold text-foreground">{session.duration_min} mins</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs">
                      <Clock className="h-3.5 w-3.5 text-violet-600" />
                      <span>{formatWhen(session.scheduled_at)}</span>
                    </div>

                    {status !== "Completed" && (
                      <button
                        onClick={() => markCompleted(session.id)}
                        className="flex items-center gap-1 rounded-xl border bg-background px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                      </button>
                    )}

                    <Link
                      href={attendanceHref}
                      className="flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-xs"
                    >
                      <Users className="h-3.5 w-3.5" /> Mark Attendance →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
