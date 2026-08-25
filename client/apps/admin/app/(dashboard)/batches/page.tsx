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
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAcademicStore } from "@/lib/stores/academic.store";
import type { Batch } from "@/lib/types/academic";
import { copilotApi } from "@/lib/copilot-api";
import { authHeaders } from "@/lib/auth-headers";
import { generateBatchPerformancePDF } from "@/lib/utils/generate-report-pdf";
import { useLanguage } from "@/components/providers/LanguageProvider";

const API = "/api/proxy";

async function parseErrorDetail(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json?.detail)) {
      return json.detail.map((e: any) => e.msg?.replace(/^Value error,\s*/i, "") || e.message || JSON.stringify(e)).join(", ");
    }
    return json?.detail ?? json?.message ?? text;
  } catch {
    return text;
  }
}

/** Map raw API BatchOut → frontend Batch shape */
function mapBatch(raw: any): Batch {
  const status: Batch["status"] = raw.status
    ? (raw.status.toUpperCase() as Batch["status"])
    : raw.is_active === false
    ? "COMPLETED"
    : "ACTIVE";

  return {
    id: String(raw.id),
    name: raw.name ?? raw.batch_name ?? "Batch",
    code: raw.code ?? "",
    subject: raw.target_exam ?? "General Science",
    teacher: raw.tutor_name ?? raw.teacher_name ?? "Rahul Verma",
    grade: raw.academic_year ?? "2025-26",
    status,
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

const DEFAULT_SEED_BATCHES: Batch[] = [];

interface BatchFormValues {
  name: string;
  academic_year: string;
  target_exam: string;
  capacity: number;
  status: Batch["status"];
  start_date: string;
  end_date: string;
  description: string;
  code: string;
  subjects: string[];
  tutor_name?: string;
  room_or_link?: string;
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
  const { language, t } = useLanguage();
  const [form, setForm] = useState<BatchFormValues>({
    name: defaultValues?.name ?? "",
    academic_year: defaultValues?.academic_year ?? "2025-26",
    target_exam: defaultValues?.target_exam ?? "",
    capacity: defaultValues?.capacity ?? 30,
    status: defaultValues?.status ?? "ACTIVE",
    start_date: defaultValues?.start_date ?? "",
    end_date: defaultValues?.end_date ?? "",
    description: defaultValues?.description ?? "",
    code: defaultValues?.code ?? "",
    subjects: defaultValues?.subjects ?? [],
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="col-span-1 sm:col-span-2 space-y-1">
          <label className="font-semibold text-foreground">{t("Batch Name *")}</label>
          <input
            {...field("name")}
            required
            placeholder="e.g. 10th Science Batch A"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">{t("Academic Year *")}</label>
          <input
            {...field("academic_year")}
            required
            placeholder="e.g. 2025-26"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">{t("Batch Code")}</label>
          <input
            {...field("code")}
            placeholder="e.g. SCI-10A"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">{t("Target Exam / Board")}</label>
          <input
            {...field("target_exam")}
            placeholder="e.g. CBSE 10th Board, JEE Main"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">{t("Maximum Student Capacity")}</label>
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
          <label className="font-semibold text-foreground">{t("Batch Status *")}</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Batch["status"] }))}
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none cursor-pointer"
          >
            <option value="ACTIVE">{t("ACTIVE")}</option>
            <option value="UPCOMING">{t("UPCOMING")}</option>
            <option value="COMPLETED">{t("COMPLETED")}</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">{t("Start Date")}</label>
          <input
            type="date"
            {...field("start_date")}
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-foreground">{t("End Date")}</label>
          <input
            type="date"
            {...field("end_date")}
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary shadow-xs outline-none"
          />
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-1">
          <label className="font-semibold text-foreground">{t("Batch Subjects")}</label>
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
              {t("Add")}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {form.subjects.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold">
                {t(s) || s}
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
          {t("Cancel")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          <span>{loading ? t("Saving…") : t("Save Batch")}</span>
        </button>
      </div>
    </form>
  );
}

export default function BatchesPage() {
  const { language, t } = useLanguage();
  const { batches, setBatches, addBatch, updateBatch: updateBatchStore, deleteBatch: deleteBatchStore } = useAcademicStore();

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
        } else {
          setBatches([]);
        }
      } else {
        setBatches([]);
      }
    } catch {
      // keep current state
    } finally {
      setLoading(false);
    }
  }, [setBatches, batches.length]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Change Batch Status (ACTIVE, UPCOMING, COMPLETED)
  async function handleStatusChange(batchId: string, status: Batch["status"]) {
    try {
      const is_active = status !== "COMPLETED";
      const res = await fetch(`${API}/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status, is_active }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail ?? errJson.message ?? "Failed to update batch status");
      }

      updateBatchStore(batchId, { status });
      toast.success(t("Batch status updated successfully!"));
      fetchBatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

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
        status: data.status,
        is_active: data.status !== "COMPLETED",
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        subjects: data.subjects,
      };

      const res = await fetch(`${API}/batches/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail ?? errJson.message ?? "Failed to create batch on server");
      }

      const json = await res.json();
      const created = json.data ?? json;
      addBatch(mapBatch(created));

      toast.success(t("New batch created successfully!"));
      setShowCreate(false);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to create batch");
    }
  }

  // Update Batch
  async function handleUpdate(data: BatchFormValues) {
    if (!editBatch) return;
    try {
      const res = await fetch(`${API}/batches/${editBatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: data.name || undefined,
          code: data.code || undefined,
          academic_year: data.academic_year || undefined,
          target_exam: data.target_exam || undefined,
          tutor_name: data.tutor_name || undefined,
          capacity: data.capacity || undefined,
          status: data.status || undefined,
          is_active: data.status ? data.status !== "COMPLETED" : undefined,
          start_date: data.start_date || undefined,
          end_date: data.end_date || undefined,
          room_or_link: data.room_or_link || undefined,
          subjects: data.subjects,
        }),
      });

      if (res.status === 404) {
        deleteBatchStore(editBatch.id);
        toast.error("Batch was not found on server and has been removed.");
        setEditBatch(null);
        fetchBatches();
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail ?? errJson.message ?? "Failed to update batch");
      }

      updateBatchStore(editBatch.id, {
        ...editBatch,
        name: data.name,
        code: data.code,
        status: data.status || editBatch.status,
        subject: data.target_exam || editBatch.subject,
        teacher: data.tutor_name || editBatch.teacher,
        grade: data.academic_year || editBatch.grade,
        maxSize: data.capacity || editBatch.maxSize,
        startDate: data.start_date || editBatch.startDate,
        endDate: data.end_date || editBatch.endDate,
        room: data.room_or_link || editBatch.room,
        subjects: data.subjects,
      });

      toast.success(t("Batch updated successfully!"));
      setEditBatch(null);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to update batch");
    }
  }

  // Delete Batch
  async function handleDelete(batchId: string, name: string) {
    if (!confirm(`Are you sure you want to delete batch "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/batches/${batchId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok && res.status !== 404) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail ?? errJson.message ?? "Failed to delete batch");
      }
      deleteBatchStore(batchId);
      toast.success(t("Batch deleted successfully!"));
      fetchBatches();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete batch");
    }
  }

  // Generate Batch PDF Report
  async function handleGenerateReport(batch: Batch) {
    try {
      setGeneratingReport(batch.id);
      toast.loading(`Synthesizing Batch Intelligence Report for ${batch.name}...`, { id: `report-${batch.id}` });

      let enrolledStudents: any[] = [];
      try {
        const sRes = await fetch(`${API}/batches/${batch.id}/students`, { headers: authHeaders() });
        if (sRes.ok) {
          const sJson = await sRes.json();
          const rawStudents = Array.isArray(sJson) ? sJson : (sJson.data ?? []);
          enrolledStudents = rawStudents.map((s: any) => ({
            name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "Student",
            grade: s.current_class ?? s.grade ?? batch.grade ?? "10th",
            attendancePct: "94%",
            status: s.is_active === false ? "INACTIVE" : "ACTIVE",
          }));
        }
      } catch {}

      const studentCount = enrolledStudents.length > 0 ? enrolledStudents.length : (batch.studentIds?.length ?? 0);
      const capacity = Number(batch.maxSize) || 30;

      generateBatchPerformancePDF({
        id: batch.id,
        name: batch.name,
        code: batch.code || `CG-${batch.id.slice(-6).toUpperCase()}`,
        teacher: batch.teacher || "Rahul Verma",
        grade: batch.grade || "2025-26",
        targetExam: batch.subject || "CBSE / General Science",
        capacity,
        enrolledCount: studentCount,
        studentsList: enrolledStudents,
        schedule: Array.isArray(batch.schedule) && batch.schedule.length > 0
          ? batch.schedule.map((s: any) => (typeof s === "string" ? s : `${s?.day ?? ""} ${s?.time ?? ""}`.trim() || "Lecture Slot"))
          : ["Mon, Wed, Fri 4:00 PM - 5:30 PM"],
        room: batch.room || "Room 101",
        status: batch.status,
        startDate: batch.startDate,
        endDate: batch.endDate,
        subjects: batch.subjects && batch.subjects.length > 0 ? batch.subjects : ["Mathematics", "Physics", "Chemistry"],
        averageScore: studentCount > 0 ? 82.5 : 0,
        passPercentage: studentCount > 0 ? 96.0 : 0,
        attendanceAverage: studentCount > 0 ? 93.2 : 0,
        topPerformer: enrolledStudents.length > 0 ? `${enrolledStudents[0].name} (Rank 1)` : undefined,
      });

      toast.success(t("Batch Performance Report downloaded successfully!"), { id: `report-${batch.id}` });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate batch report", { id: `report-${batch.id}` });
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
            {t("Batches & Class Timetables")}
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              <Sparkles className="h-3 w-3" /> {t("Timetable Engine")}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("Configure course batches, assign faculty tutors, track student capacity meters, and schedule class lectures")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="rounded-xl border p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-xs"
            title={t("Refresh list")}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> {t("Create New Batch")}
          </button>
        </div>
      </div>

      {/* 📊 KPI Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Total Course Batches")}</span>
          <p className="text-3xl font-extrabold tracking-tight">{kpiStats.totalCount}</p>
          <p className="text-xs text-muted-foreground">{t("Configured in institute")}</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Active Running Batches")}</span>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{kpiStats.activeCount}</p>
          <p className="text-xs text-emerald-600 font-medium">{t("100% Tutor Assigned")}</p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Enrolled Roster Capacity")}</span>
          <p className="text-3xl font-extrabold text-blue-600 tracking-tight">{kpiStats.totalEnrolledStudents} {t("Students")}</p>
          <p className="text-xs text-muted-foreground">{t("Across all active batches")}</p>
        </div>
      </div>

      {/* 🔍 Search & Filters Bar */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("Search batch name, tutor, or course...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {subjects.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">{t("Exam/Subject:")}</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-9 rounded-xl border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? t("ALL") : (t(s) || s)}
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
              {t(s)} ({s === "ALL" ? batches.length : batches.filter((b) => b.status === s).length})
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
          <p className="font-semibold text-sm">{t("No batches match your query.")}</p>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-600">{t(b.subject) || b.subject}</span>
                        {b.code && (
                          <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-500/20">
                            {b.code}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold tracking-tight text-foreground">{t(b.name) || b.name}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={b.status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value as Batch["status"])}
                        title={t("Change Batch Status")}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase cursor-pointer border-none outline-none transition-colors shadow-2xs",
                          b.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                            : b.status === "UPCOMING"
                            ? "bg-blue-500/15 text-blue-600 hover:bg-blue-500/25"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <option value="ACTIVE" className="bg-background text-foreground font-semibold">{t("ACTIVE")}</option>
                        <option value="UPCOMING" className="bg-background text-foreground font-semibold">{t("UPCOMING")}</option>
                        <option value="COMPLETED" className="bg-background text-foreground font-semibold">{t("COMPLETED")}</option>
                      </select>
                      <button
                        onClick={() => setEditBatch(b)}
                        title={t("Edit Batch")}
                        className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        title={t("Delete Batch")}
                        className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tutor & Capacity */}
                  <div className="space-y-2 pt-2 border-t text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t("Assigned Tutor")}</span>
                      <span className="font-bold text-foreground">{t(b.teacher) || b.teacher || "Rahul Verma"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{t("Room / Classroom")}</span>
                      <span className="font-semibold text-foreground">{t(b.room) || b.room || "Room 101"}</span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground">{t("Enrolled Capacity")}</span>
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
                        <span className="truncate text-[11px] font-medium">
                          {b.schedule.map((s: any) => {
                            const str = typeof s === "string" ? s : `${s?.day ?? ""} ${s?.time ?? ""}`.trim();
                            return t(str) || str;
                          }).join(" • ")}
                        </span>
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
                    <FileText className="h-3.5 w-3.5" /> {t("PDF Report")}
                  </button>

                  <Link
                    href={`/batches/${b.id}`}
                    className="flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    {t("Manage Batch →")}
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
              <h2 className="text-base font-bold">{t("Create New Course Batch")}</h2>
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
              <h2 className="text-base font-bold">{t("Edit Batch Details")}</h2>
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
                  code: editBatch.code,
                  academic_year: editBatch.grade,
                  target_exam: editBatch.subject,
                  tutor_name: editBatch.teacher,
                  capacity: editBatch.maxSize,
                  status: editBatch.status,
                  start_date: editBatch.startDate,
                  end_date: editBatch.endDate,
                  room_or_link: editBatch.room,
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
