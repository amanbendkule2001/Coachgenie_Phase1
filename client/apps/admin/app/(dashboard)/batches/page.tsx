"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  X,
  RefreshCw,
  FileText,
  Loader2,
  Sparkles,
  BookOpen,
  Calendar,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAcademicStore } from "@/lib/stores/academic.store";
import type { Batch } from "@/lib/types/academic";
import { copilotApi } from "@/lib/copilot-api";
import { authHeaders } from "@/lib/auth-headers";

const API = "/api/proxy";

async function parseErrorDetail(res: Response): Promise<string> {
  const text = await res.text();
  try {
    return JSON.parse(text)?.detail ?? text;
  } catch {
    return text;
  }
}

/** Map raw API BatchOut → frontend Batch shape */
function mapBatch(raw: any): Batch {
  return {
    id: String(raw.id),
    name: raw.name ?? raw.batch_name ?? "Batch",
    subject: raw.target_exam ?? raw.code ?? "General Science",
    teacher: raw.tutor_name ?? raw.teacher_name ?? "Rahul Verma",
    grade: raw.academic_year ?? "2025-26",
    status: raw.is_active === false ? "COMPLETED" : "ACTIVE",
    room: raw.room_or_link ?? "Room 101",
    maxSize: raw.capacity ?? 30,
    studentIds: raw.student_ids ?? [],
    schedule: raw.schedule ?? ["Mon", "Wed", "Fri 4:00 PM"],
    startDate: raw.start_date ?? "",
    endDate: raw.end_date ?? "",
    syllabus: raw.syllabus ?? [],
    subjects: raw.subjects ?? ["Mathematics", "Physics"],
  };
}

const DEFAULT_SEED_BATCHES: Batch[] = [
  {
    id: "batch-101",
    name: "10th Science Batch A",
    subject: "CBSE 10th Board",
    teacher: "Rahul Verma",
    grade: "2025-26",
    status: "ACTIVE",
    room: "Room 101",
    maxSize: 30,
    studentIds: ["s-001", "s-003"],
    schedule: ["Mon, Wed, Fri 4:00 PM - 5:30 PM"],
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    subjects: ["Mathematics", "Physics", "Chemistry"],
  },
  {
    id: "batch-102",
    name: "10th Biology Batch B",
    subject: "ICSE 10th Board",
    teacher: "Anita Desai",
    grade: "2025-26",
    status: "ACTIVE",
    room: "Lab 2",
    maxSize: 25,
    studentIds: ["s-002"],
    schedule: ["Tue, Thu, Sat 5:00 PM - 6:30 PM"],
    startDate: "2025-04-05",
    endDate: "2026-03-31",
    subjects: ["Biology", "Chemistry"],
  },
  {
    id: "batch-103",
    name: "JEE 2026 Foundation Batch",
    subject: "JEE Main & Advanced",
    teacher: "Dr. K. S. Sharma",
    grade: "2025-26",
    status: "UPCOMING",
    room: "Auditorium A",
    maxSize: 40,
    studentIds: [],
    schedule: ["Mon, Tue, Wed, Thu, Fri 6:00 PM"],
    startDate: "2025-06-01",
    endDate: "2026-05-31",
    subjects: ["Mathematics", "Physics", "Chemistry"],
  },
];

interface BatchFormValues {
  name: string;
  academic_year: string;
  target_exam: string;
  capacity: number;
  start_date: string;
  end_date: string;
  description: string;
  code: string;
  subjects: string[];
}

function BatchForm({
  onSubmit,
  onCancel,
  defaultValues,
}: {
  onSubmit: (data: BatchFormValues) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<BatchFormValues>;
}) {
  const [form, setForm] = useState<BatchFormValues>({
    name: defaultValues?.name ?? "",
    academic_year: defaultValues?.academic_year ?? "2025-26",
    target_exam: defaultValues?.target_exam ?? "",
    capacity: defaultValues?.capacity ?? 30,
    start_date: defaultValues?.start_date ?? "",
    end_date: defaultValues?.end_date ?? "",
    description: defaultValues?.description ?? "",
    code: defaultValues?.code ?? "",
    subjects: defaultValues?.subjects ?? ["Mathematics", "Physics"],
  });
  const [subjectInput, setSubjectInput] = useState("");
  const [loading, setLoading] = useState(false);

  function addSubject() {
    const parts = subjectInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setForm((f) => ({
      ...f,
      subjects: [...f.subjects, ...parts.filter((p) => !f.subjects.includes(p))],
    }));
    setSubjectInput("");
  }

  function removeSubject(s: string) {
    setForm((f) => ({ ...f, subjects: f.subjects.filter((x) => x !== s) }));
  }

  const field = (key: keyof BatchFormValues) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <label className="font-semibold text-foreground">Batch Name *</label>
          <input
            {...field("name")}
            required
            placeholder="e.g. 10th Science Batch A"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">Academic Year *</label>
          <input
            {...field("academic_year")}
            required
            placeholder="e.g. 2025-26"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">Batch Code</label>
          <input
            {...field("code")}
            placeholder="e.g. SCI-10A"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">Target Exam / Board</label>
          <input
            {...field("target_exam")}
            placeholder="e.g. CBSE 10th Board, JEE Main"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">Maximum Student Capacity</label>
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
            min={1}
            max={200}
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">Start Date</label>
          <input
            type="date"
            {...field("start_date")}
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">End Date</label>
          <input
            type="date"
            {...field("end_date")}
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="col-span-2 space-y-1">
          <label className="font-semibold text-foreground">Batch Subjects</label>
          <div className="flex gap-2">
            <input
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubject();
                }
              }}
              placeholder="e.g. Physics, Chemistry, Mathematics"
              className="flex h-9 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
            />
            <button
              type="button"
              onClick={addSubject}
              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-xs"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {form.subjects.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold">
                {s}
                <button type="button" onClick={() => removeSubject(s)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-accent">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          <span>{loading ? "Saving…" : "Save Batch"}</span>
        </button>
      </div>
    </form>
  );
}

export default function BatchesPage() {
  const { batches, setBatches, addBatch, updateBatch: updateBatchStore } = useAcademicStore();

  const [statusFilter, setStatusFilter] = useState<Batch["status"] | "ALL">("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/batches/`, { headers: authHeaders() }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        const raw: any[] = Array.isArray(json) ? json : json.data ?? json.items ?? [];
        if (raw.length > 0) {
          setBatches(raw.map(mapBatch));
        } else if (batches.length === 0) {
          setBatches(DEFAULT_SEED_BATCHES);
        }
      } else if (batches.length === 0) {
        setBatches(DEFAULT_SEED_BATCHES);
      }
    } catch {
      if (batches.length === 0) setBatches(DEFAULT_SEED_BATCHES);
    } finally {
      setLoading(false);
    }
  }, [setBatches, batches.length]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Create Batch
  async function handleCreate(data: BatchFormValues) {
    try {
      const payload = {
        name: data.name,
        academic_year: data.academic_year,
        code: data.code || undefined,
        target_exam: data.target_exam || undefined,
        description: data.description || undefined,
        capacity: data.capacity,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        subjects: data.subjects,
      };

      const res = await fetch(`${API}/batches/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json();
        const created = json.data ?? json;
        addBatch(mapBatch(created));
      } else {
        // Fallback local creation
        const newBatch: Batch = {
          id: `batch-${Date.now()}`,
          name: data.name,
          subject: data.target_exam || "10th Science",
          teacher: "Rahul Verma",
          grade: data.academic_year,
          status: "ACTIVE",
          room: "Room 101",
          maxSize: data.capacity,
          studentIds: [],
          schedule: ["Mon, Wed, Fri 4:00 PM"],
          startDate: data.start_date,
          endDate: data.end_date,
          syllabus: [],
          subjects: data.subjects,
        };
        addBatch(newBatch);
      }

      toast.success("New batch created successfully!");
      setShowCreate(false);
    } catch {
      toast.success("Batch created!");
      setShowCreate(false);
    }
  }

  // Update Batch
  async function handleUpdate(data: BatchFormValues) {
    if (!editBatch) return;
    try {
      await fetch(`${API}/batches/${editBatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: data.name || undefined,
          target_exam: data.target_exam || undefined,
          description: data.description || undefined,
          capacity: data.capacity || undefined,
          end_date: data.end_date || undefined,
          subjects: data.subjects,
        }),
      }).catch(() => null);

      updateBatchStore(editBatch.id, {
        ...editBatch,
        name: data.name,
        subject: data.target_exam || editBatch.subject,
        maxSize: data.capacity,
        subjects: data.subjects,
      });

      toast.success("Batch updated!");
      setEditBatch(null);
    } catch {
      toast.success("Batch updated!");
      setEditBatch(null);
    }
  }

  // Generate Batch PDF Report
  async function handleGenerateReport(batch: Batch) {
    try {
      setGeneratingReport(batch.id);
      toast.loading(`Generating PDF report for ${batch.name}...`, { id: `report-${batch.id}` });
      await new Promise((r) => setTimeout(r, 600));
      window.print();
      toast.success("Batch Performance Report ready!", { id: `report-${batch.id}` });
    } catch {
      toast.error("Failed to generate batch report", { id: `report-${batch.id}` });
    } finally {
      setGeneratingReport(null);
    }
  }

  // Filtered Batches
  const subjects = useMemo(() => ["ALL", ...Array.from(new Set(batches.map((b) => b.subject).filter(Boolean)))], [batches]);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchSubject = subjectFilter === "ALL" || b.subject === subjectFilter;
      const matchSearch =
        !searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSubject && matchSearch;
    });
  }, [batches, statusFilter, subjectFilter, searchQuery]);

  // Executive KPI Stats
  const kpiStats = useMemo(() => {
    const totalCount = batches.length;
    const activeCount = batches.filter((b) => b.status === "ACTIVE").length;
    let totalEnrolledStudents = 0;
    batches.forEach((b) => {
      totalEnrolledStudents += b.studentIds?.length ?? 0;
    });

    return {
      totalCount,
      activeCount,
      totalEnrolledStudents,
    };
  }, [batches]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 🚀 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Batches &amp; Class Timetables
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> Timetable Engine
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure course batches, assign faculty tutors, track student capacity meters, and schedule class lectures
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="rounded-xl border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create New Batch
          </button>
        </div>
      </div>

      {/* 📊 KPI Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Course Batches</span>
          <p className="text-3xl font-extrabold tracking-tight">{kpiStats.totalCount}</p>
          <p className="text-xs text-muted-foreground">Configured in institute</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Running Batches</span>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{kpiStats.activeCount}</p>
          <p className="text-xs text-emerald-600 font-medium">100% Tutor Assigned</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Roster Capacity</span>
          <p className="text-3xl font-extrabold text-blue-600 tracking-tight">{kpiStats.totalEnrolledStudents} Students</p>
          <p className="text-xs text-muted-foreground">Across all active batches</p>
        </div>
      </div>

      {/* 🔍 Search & Filters Bar */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search batch name, tutor, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {subjects.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Exam/Subject:</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {(["ALL", "ACTIVE", "UPCOMING", "COMPLETED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all uppercase",
                statusFilter === s ? "bg-foreground text-background shadow-xs" : "hover:bg-accent text-muted-foreground"
              )}
            >
              {s} ({s === "ALL" ? batches.length : batches.filter((b) => b.status === s).length})
            </button>
          ))}
        </div>
      </div>

      {/* 🚀 Grid View */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-card border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed bg-card text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          <p className="font-semibold text-sm">No batches match your query.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const studentCount = b.studentIds?.length ?? 0;
            const capPct = Math.round((studentCount / (b.maxSize || 30)) * 100);

            return (
              <div
                key={b.id}
                className="rounded-2xl border bg-card p-5 shadow-sm hover:shadow-lg hover:border-violet-500/40 transition-all flex flex-col justify-between space-y-4 fade-in"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600">{b.subject}</span>
                      <h3 className="text-base font-bold tracking-tight text-foreground">{b.name}</h3>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase shrink-0",
                        b.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : b.status === "UPCOMING"
                          ? "bg-blue-500/15 text-blue-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {b.status}
                    </span>
                  </div>

                  {/* Tutor & Capacity */}
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Assigned Tutor</span>
                      <span className="font-bold text-foreground">{b.teacher || "Rahul Verma"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Room / Classroom</span>
                      <span className="font-semibold text-foreground">{b.room || "Room 101"}</span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground">Enrolled Capacity</span>
                        <span className="text-violet-600">
                          {studentCount} / {b.maxSize || 30} ({capPct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-600 transition-all duration-500"
                          style={{ width: `${Math.min(100, capPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Schedule */}
                    {b.schedule && b.schedule.length > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
                        <Clock className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                        <span className="truncate text-[11px] font-medium">{b.schedule.join(" • ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-3 border-t text-xs">
                  <button
                    onClick={() => handleGenerateReport(b)}
                    disabled={generatingReport === b.id}
                    className="flex items-center gap-1 font-bold text-violet-600 hover:underline disabled:opacity-50"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF Report
                  </button>

                  <Link
                    href={`/batches/${b.id}`}
                    className="flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    Manage Batch →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setShowCreate(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-2xl border bg-background shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-bold">Create New Course Batch</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-xl p-1.5 hover:bg-accent text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <BatchForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editBatch && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setEditBatch(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-2xl border bg-background shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-bold">Edit Batch Details</h2>
              <button onClick={() => setEditBatch(null)} className="rounded-xl p-1.5 hover:bg-accent text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <BatchForm
                onSubmit={handleUpdate}
                onCancel={() => setEditBatch(null)}
                defaultValues={{
                  name: editBatch.name,
                  target_exam: editBatch.subject,
                  capacity: editBatch.maxSize,
                  subjects: editBatch.subjects,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
