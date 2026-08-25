

"use client";
import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, BookOpen, X, FileText, Plus, Trash2, Pencil, MapPin, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAcademicStore } from "@/lib/stores/academic.store";
import { toast } from "sonner";
import type { Batch, BatchStatus } from "@/lib/types/academic";
import { authHeaders } from "@/lib/auth-headers";
import { generateBatchPerformancePDF } from "@/lib/utils/generate-report-pdf";
import { useLanguage } from "@/components/providers/LanguageProvider";

const API = "/api/proxy"

function mapBatch(raw: any, existingSyllabus?: any[]): Batch {
  const status: BatchStatus = raw.is_active === false ? "COMPLETED" : "ACTIVE";
  return {
    id:         String(raw.id),
    name:       raw.name          ?? "",
    subject:    raw.target_exam   ?? raw.code ?? "",
    teacher:    raw.tutor_name    ?? "",
    grade:      raw.academic_year ?? "",
    status,
    room:       raw.room_or_link  ?? "",
    maxSize:    raw.capacity      ?? 50,
    studentIds: raw.student_ids   ?? [],
    schedule:   raw.schedule      ?? [],
    startDate:  raw.start_date    ?? "",
    endDate:    raw.end_date      ?? "",
    syllabus:   (raw.syllabus?.length ? raw.syllabus : null) ?? existingSyllabus ?? [],
    subjects:   raw.subjects      ?? [],
  };
}

function mapStudent(raw: any) {
  return {
    id:          String(raw.id),
    name:        `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim(),
    email:       raw.email         ?? "",
    phone:       raw.phone         ?? "",
    parentName:  raw.parent_name   ?? "",
    parentPhone: raw.parent_phone  ?? "",
    grade:       raw.current_class ?? "",
    subjects:    raw.subjects      ?? [],
    batchIds:    raw.batch_ids     ?? [],
    status:      raw.is_active === false ? "INACTIVE" : "ACTIVE",
    address:     raw.address       ?? "",
    dob:         raw.date_of_birth ?? "",
    joinedAt:    raw.joined_at     ?? raw.created_at ?? new Date().toISOString(),
    fees:        { total: 0, paid: 0, due: 0 },
  };
}

function mapLead(raw: any) {
  return {
    id:       String(raw.id),
    name:     raw.full_name         ?? raw.name   ?? "",
    phone:    raw.phone             ?? "",
    email:    raw.email             ?? "",
    grade:    raw.grade             ?? "",
    standard: raw.standard          ?? "",
    board:    raw.board_name        ?? "",
    course:   raw.interested_course ?? raw.subject ?? "",
    stage:    (raw.status ?? "new").toUpperCase() as string,
    source:   raw.source            ?? "",
  };
}

async function fetchBatchStudents(batchId: string) {
  const res  = await fetch(`${API}/batches/${batchId}/students`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch students");
  const json = await res.json();
  const enrolled: any[] = Array.isArray(json) ? json : (json.data ?? []);
  return enrolled.map(mapStudent);
}

const STAGE_COLORS: Record<string, string> = {
  NEW:       "bg-slate-100 text-slate-700 border-slate-200",
  CONTACTED: "bg-blue-50 text-blue-700 border-blue-200",
  DEMO:      "bg-violet-50 text-violet-700 border-violet-200",
  ENROLLED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOST:      "bg-red-50 text-red-600 border-red-200",
};

type Tab = "students" | "classes" | "leads" | "syllabus";

function ClassesTab({
  batchId, classes, setClasses, onMarkDone, batch,
}: {
  batchId: string;
  classes: any[];
  setClasses: React.Dispatch<React.SetStateAction<any[]>>;
  onMarkDone: (id: string) => void;
  batch: any;
}) {
  const { language, t } = useLanguage();
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", scheduled_at: "", duration_min: "60", room_or_link: "", subject_id: "",
  });

  const subjects = useMemo(() =>
    (batch?.subjects ?? []).map((s: any, index: number) => ({
      id:   String(s?.id ?? s ?? index),
      name: s?.name ?? s?.title ?? s,
    })),
    [batch?.subjects]
  );

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduled_at) return toast.error("Title and date/time are required");
    if (!form.subject_id) return toast.error("Please select a subject");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/batches/classes`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          batch_id:     batchId,
          subject_name: form.subject_id,
          tutor_id:     batch?.tutor_id ?? null,
          title:        form.title.trim(),
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          duration_min: parseInt(form.duration_min) || 60,
          room_or_link: form.room_or_link.trim() || null,
          description:  null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? err.message ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setClasses(prev => [...prev, json.data ?? json]);
      setForm({ title: "", scheduled_at: "", duration_min: "60", room_or_link: "", subject_id: "" });
      setShowForm(false);
      toast.success(t("Class scheduled"));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to schedule class");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("Classes")} ({classes.length})</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-3.5 w-3.5" /> {t("Schedule Class")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSchedule} className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("New Class")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("Title *")}</label>
              <input required value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Kinematics — Class 1"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("Date & Time *")}</label>
              <input required type="datetime-local" value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("Subject *")}</label>
              <select required value={form.subject_id}
                onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary">
                <option value="">{t("Select subject...")}</option>
                {subjects.map((s: { id: string; name: string }, i: number) => (
  <option key={`${s.name}-${i}`} value={s.name}>
    {t(s.name) || s.name}
  </option>
))}
              </select>
              {subjects.length === 0 && (
                <p className="text-xs text-amber-600">{t("No subjects available in this batch")}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("Duration (minutes)")}</label>
              <input type="number" min="15" max="300" value={form.duration_min}
                onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">{t("Room / Link")}</label>
              <input value={form.room_or_link}
                onChange={e => setForm(f => ({ ...f, room_or_link: e.target.value }))}
                placeholder="Room 101 or meet.google.com/..."
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-1.5 text-sm hover:bg-accent transition-colors">{t("Cancel")}</button>
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {submitting ? t("Scheduling...") : t("Schedule")}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {classes.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("No classes scheduled yet.")}</p>
        )}
        {classes.map((c: any, i: number) => (
          <div key={c.id ?? `class-${i}`}
            className="flex items-center justify-between rounded-lg border p-3 gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t(c.title) || c.title}</p>
              <p className="text-xs text-muted-foreground">
                {c.scheduled_at ? format(new Date(c.scheduled_at), "dd MMM, h:mm a") : "—"}
                {c.duration_min ? ` · ${c.duration_min} min` : ""}
                {c.room_or_link ? ` · ${t(c.room_or_link) || c.room_or_link}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn(
                "text-[10px] font-medium rounded-full px-2 py-0.5 border",
                c.status === "completed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              )}>{t(c.status) || c.status}</span>
              {c.status !== "completed" && (
                <button onClick={() => onMarkDone(String(c.id))}
                  className="rounded-md border px-2 py-1 text-[10px] hover:bg-accent transition-colors">{t("Done")}</button>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { language, t } = useLanguage();
  const { id }  = use(params);
  const router  = useRouter();
  const store   = useAcademicStore();

  const [batch,     setBatch]     = useState<any>(store.batches.find(b => b.id === id) ?? null);
  const [students,  setStudents]  = useState<any[]>([]);
  const [classes,   setClasses]   = useState<any[]>([]);
  const [leads,     setLeads]     = useState<any[]>([]);
  const [syllabus,  setSyllabus]  = useState<any[]>([]);   // ← NEW
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("students");

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");


  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1. Batch
        const bRes = await fetch(`${API}/batches/${id}`, { headers: authHeaders() });
        if (bRes.ok) {
          const bJson = await bRes.json();
          const rawBatch = bJson.data ?? bJson;
          const currentBatch = mapBatch(rawBatch);
          setBatch(currentBatch);
        } else {
          if (bRes.status === 404) {
            store.deleteBatch(id);
          }
          setError("Batch not found in database.");
          setLoading(false);
          return;
        }

        // 2. Classes
        const cRes = await fetch(`${API}/batches/${id}/classes`, { headers: authHeaders() });
        if (cRes.ok) {
          const cJson = await cRes.json();
          setClasses(Array.isArray(cJson) ? cJson : (cJson.data ?? []));
        }

        // 3. Students
        const enrolled = await fetchBatchStudents(id);
        setStudents(enrolled);

        // 4. Leads
        const lRes = await fetch(`${API}/leads/?batch_id=${id}`, { headers: authHeaders() });
        if (lRes.ok) {
          const lJson = await lRes.json();
          const rawLeads: any[] = Array.isArray(lJson) ? lJson : (lJson.data ?? lJson.items ?? []);
          setLeads(rawLeads.map(mapLead));
        }

        // 5. Syllabus ← NEW
        // const sRes = await fetch(`${API}/syllabus/${id}`, { headers: authHeaders() });
        // if (sRes.ok) {
        //   const sJson = await sRes.json();
        //   setSyllabus(sJson.data ?? []);
        // }

        try {
  const [batchRes, subjectsRes] = await Promise.all([
    fetch(`${API}/batches/${id}`, { headers: authHeaders() }),
    fetch(`${API}/batches/subjects`, { headers: authHeaders() }),
  ]);
  if (batchRes.ok && subjectsRes.ok) {
    const batchJson    = await batchRes.json();
    const subjectsJson = await subjectsRes.json();
    const batchData    = batchJson.data ?? batchJson;
    const allSubjects: any[] = subjectsJson.data ?? [];
    const batchSubjectNames  = new Set(
      (batchData.subjects ?? []).map((s: string) => s.toLowerCase().trim())
    );
    const matchedSubjects = allSubjects.filter(
      (s: any) => batchSubjectNames.has(s.name.toLowerCase().trim())
    );
    // Fetch syllabus for each matched subject
    const topicArrays = await Promise.all(
      matchedSubjects.map((s: any) =>
        fetch(`${API}/batches/${id}/syllabus?subject_id=${s.id}`, { headers: authHeaders() })
          .then(r => r.ok ? r.json() : { data: [] })
          .then(j => (j.data ?? []).map((t: any) => ({ ...t, subjectName: s.name })))
      )
    );
    setSyllabus(topicArrays.flat());
  }
} catch {
  // silent — syllabus is optional on this page
}

      } catch (err: any) {
        setError(err.message ?? "Failed to load batch");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

//   async function loadAvailableStudents() {
//     try {
//       const res = await fetch(`${API}/students/`, {
//         headers: authHeaders(),
//       });
//       if (!res.ok) throw new Error("Failed to load students");
//       const json = await res.json();
//       // const allStudents = Array.isArray(json) ? json : (json.data ?? []);
//       // const enrolledIds = new Set(students.map((s) => String(s.id)));
//       // const remaining = allStudents.filter((s: any) => !enrolledIds.has(String(s.id)));
//       // setAvailableStudents(remaining);
//       const allStudents = Array.isArray(json) ? json : (json.data ?? []);
// const enrolledIds = new Set(students.map((s) => String(s.id)));
// const remaining = allStudents
//   .filter((s: any) => !enrolledIds.has(String(s.id)))
//   .map(mapStudent);
// setAvailableStudents(remaining);
//     } catch {
//       toast.error("Failed to load students");
//     }
//   }
async function loadAvailableStudents() {
  try {
    const res = await fetch(`${API}/students/`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error("Failed to load students");

    const json = await res.json();
    const allStudents = Array.isArray(json) ? json : (json.data ?? []);

    const enrolledIds = new Set(students.map((s) => String(s.id)));

    // ✅ FIX: Only ACTIVE + NOT ENROLLED
    const remaining = allStudents
      .filter((s: any) => 
        !enrolledIds.has(String(s.id)) && 
        s.is_active !== false
      )
      .map(mapStudent);

    setAvailableStudents(remaining);

  } catch (error) {
    console.error(error);
    toast.error("Failed to load students");
  }
}


  // async function handleEnroll(studentId: string) {
  //   try {
  //     const res = await fetch(`${API}/batches/${id}/enroll/${studentId}`, {
  //       method: "POST", headers: authHeaders(),
  //     });
  //     if (!res.ok) throw new Error("Failed to enroll student");
  //     toast.success("Student enrolled");
  //     setStudents(await fetchBatchStudents(id));
  //   } catch (err: any) { toast.error(err.message); }
  // }
  async function handleEnroll(studentId: string) {
    if (!studentId) return;

    try {
      const res = await fetch(`${API}/batches/${id}/enroll/${studentId}`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail ?? errJson.message ?? "Failed to enroll student");
      }

      toast.success("Student assigned to batch successfully");
      
      const updatedStudents = await fetchBatchStudents(id);
      setStudents(updatedStudents);

      // Refresh batch metadata so capacity metrics (e.g. 5/50) update accurately
      const bRes = await fetch(`${API}/batches/${id}`, { headers: authHeaders() });
      if (bRes.ok) {
        const bJson = await bRes.json();
        const rawBatch = bJson.data ?? bJson;
        setBatch(mapBatch(rawBatch));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to assign student");
    }
  }

  async function handleRemove(studentId: string) {
    try {
      const res = await fetch(`${API}/batches/${id}/enroll/${studentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail ?? errJson.message ?? "Failed to remove student");
      }

      toast.success("Student removed from batch");

      const updatedStudents = await fetchBatchStudents(id);
      setStudents(updatedStudents);

      const bRes = await fetch(`${API}/batches/${id}`, { headers: authHeaders() });
      if (bRes.ok) {
        const bJson = await bRes.json();
        const rawBatch = bJson.data ?? bJson;
        setBatch(mapBatch(rawBatch));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to remove student");
    }
  }

  async function handleMarkClassDone(classId: string) {
    try {
      const res = await fetch(`${API}/batches/classes/${classId}`, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed to update class");
      setClasses(prev => prev.map(c =>
        String(c.id) === classId ? { ...c, status: "completed" } : c
      ));
      toast.success("Class marked as completed");
    } catch (err: any) { toast.error(err.message); }
  }

  if (loading) return (
    <div className="space-y-4 max-w-5xl">
      <div className="h-10 w-48 rounded-lg bg-muted animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" />
    </div>
  );

  if (error || !batch) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-muted-foreground">{error ?? "Batch not found."}</p>
      <button onClick={() => router.push("/batches")}
        className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors">
        Back to Batches
      </button>
    </div>
  );

  async function handleDeleteBatch() {
    if (!batch) return;
    if (!confirm(`Are you sure you want to delete batch "${batch.name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/batches/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail ?? errJson.message ?? "Failed to delete batch");
      }
      store.deleteBatch(id);
      toast.success(`Batch "${batch.name}" deleted successfully!`);
      router.push("/batches");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete batch");
    }
  }

  // const completedTopics  = syllabus.filter((t: any) => t.completed).length;
  const completedTopics = syllabus.filter((t: any) => t.status === "completed").length;
  const syllabusProgress = syllabus.length > 0
    ? Math.round((completedTopics / syllabus.length) * 100) : 0;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "students", label: t("Students"), count: students.length },
    { key: "classes",  label: t("Classes"),  count: classes.length  },
    { key: "leads",    label: t("Leads"),    count: leads.length    },
    { key: "syllabus", label: t("Syllabus"), count: syllabus.length },  // ← uses syllabus state
  ];

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push("/batches")}
            className="mt-1 rounded-lg p-2 hover:bg-accent text-muted-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{t(batch.name) || batch.name}</h1>
              {batch.code && (
                <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-700 border border-violet-500/20">
                  {t("Code:")} {batch.code}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {batch.subject && `${t(batch.subject) || batch.subject} · `}
              {batch.teacher && `${t(batch.teacher) || batch.teacher} · `}
              {t(batch.grade) || batch.grade}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              try {
                toast.loading(`Generating PDF report for ${batch.name}...`, { id: `batch-rep-${id}` });
                generateBatchPerformancePDF({
                  id: batch.id,
                  name: batch.name,
                  code: batch.code || `CG-${batch.id}`,
                  teacher: batch.teacher || "Rahul Verma",
                  grade: batch.grade || "2025-26",
                  targetExam: batch.subject || "CBSE / General Science",
                  capacity: batch.maxSize || 50,
                  enrolledCount: students.length,
                  schedule: batch.schedule && batch.schedule.length > 0 ? batch.schedule : ["Mon, Wed, Fri 4:00 PM"],
                  room: batch.room || "Room 101",
                  status: batch.status,
                  startDate: batch.startDate,
                  endDate: batch.endDate,
                  subjects: batch.subjects && batch.subjects.length > 0 ? batch.subjects : ["Mathematics", "Physics", "Chemistry"],
                  averageScore: 81.5,
                  passPercentage: 96.5,
                  attendanceAverage: 92.4,
                  topPerformer: students[0]?.name || "Top Student",
                });
                toast.success(t("Batch Performance Report downloaded successfully!"), { id: `batch-rep-${id}` });
              } catch (err: any) {
                toast.error(err.message || "Failed to download report", { id: `batch-rep-${id}` });
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/50 transition-colors shadow-xs"
          >
            <FileText className="h-3.5 w-3.5" /> {t("PDF Report")}
          </button>

          <button
            onClick={handleDeleteBatch}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors shadow-xs"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("Delete Batch")}
          </button>

          <Link href={`/batches/${id}/syllabus`}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
            <BookOpen className="h-4 w-4" /> {t("Syllabus")}
          </Link>
        </div>
      </div>

      {/* Subjects pills */}
      {batch.subjects && batch.subjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">{t("Curriculum Subjects:")}</span>
          {batch.subjects.map((sub: string) => (
            <span
              key={sub}
              className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300 border border-violet-500/20"
            >
              <BookOpen className="h-3 w-3 text-violet-500" />
              {t(sub) || sub}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("Enrolled"),  value: `${students.length} / ${batch.maxSize}`, icon: Users     },
          { label: t("Classes"),   value: classes.length,                         icon: Calendar  },
          { label: t("Room"),      value: t(batch.room) || batch.room || "Room 101",               icon: MapPin    },
          { label: t("Teacher"),   value: t(batch.teacher) || batch.teacher || t("Not assigned"),        icon: GraduationCap },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <Icon className="h-4 w-4 text-muted-foreground mb-2" />
            <p className="text-lg font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-full sm:w-fit overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0",
              activeTab === tab.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}>
            {tab.label}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab: Students */}
      {activeTab === "students" && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{t("Enrolled Students")} ({students.length})</h3>
          <button
            onClick={async () => {
              await loadAvailableStudents();
              setShowEnrollModal(true);
            }}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Assign Student")}
          </button>
        </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{t("No students enrolled yet.")}</p>
            )}
            {students.map(s => (
              <div key={s.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group">
                <Link href={`/students/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {(t(s.name) || s.name).split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{t(s.name) || s.name}</p>
                    <p className="text-xs text-muted-foreground">{t(s.grade) || s.grade}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium rounded-full px-2 py-0.5 border shrink-0",
                    s.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600"
                  )}>{t(s.status) || s.status}</span>
                </Link>
                <button onClick={() => handleRemove(s.id)}
                  className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Classes */}
      {activeTab === "classes" && (
        <ClassesTab batchId={id} classes={classes} setClasses={setClasses}
          onMarkDone={handleMarkClassDone} batch={batch} />
      )}

      {/* Tab: Leads */}
      {activeTab === "leads" && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{t("Leads Assigned to This Batch")} ({leads.length})</h3>
            <Link href={`/leads?batch=${id}`} className="text-xs text-primary hover:underline">
              {t("View all in Leads →")}
            </Link>
          </div>
          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm text-muted-foreground">{t("No leads assigned to this batch yet.")}</p>
              <p className="text-xs text-muted-foreground">{t("When adding a lead, select this batch from the Batch Name dropdown.")}</p>
            </div>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {leads.map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group">
                <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">
                  {(t(lead.name) || lead.name).split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{t(lead.name) || lead.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[lead.phone, t(lead.grade) || lead.grade, t(lead.standard) || lead.standard, t(lead.board) || lead.board].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {lead.course && (
                  <span className="text-xs bg-muted rounded-full px-2.5 py-0.5 font-medium shrink-0 hidden sm:block">
                    {t(lead.course) || lead.course}
                  </span>
                )}
                <span className={cn(
                  "text-[10px] font-medium rounded-full px-2.5 py-0.5 border shrink-0",
                  STAGE_COLORS[lead.stage] ?? "bg-muted text-muted-foreground"
                )}>{t(lead.stage) || lead.stage}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Syllabus */}
      {activeTab === "syllabus" && syllabus.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{t("Syllabus Progress")}</h3>
            <span className="text-xs text-muted-foreground">{completedTopics}/{syllabus.length} {t("topics")}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${syllabusProgress}%` }} />
          </div>
          <div className="space-y-2">
            {syllabus.map((topicItem: any) => (
              <div key={topicItem.id} className="flex items-center gap-3 text-sm">
                <div className={cn(
  "h-4 w-4 rounded-full border-2 shrink-0",
  topicItem.status === "completed" ? "bg-primary border-primary" : "border-muted-foreground/30"
)} />
<span className={topicItem.status === "completed" ? "line-through text-muted-foreground" : ""}>{t(topicItem.title) || topicItem.title}</span>
{topicItem.subjectName && (
  <span className="ml-auto text-xs text-muted-foreground">{t(topicItem.subjectName) || topicItem.subjectName}</span>
)}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t">
            <Link href={`/batches/${id}/syllabus`} className="text-xs text-primary hover:underline">
              {t("Manage Syllabus →")}
            </Link>
          </div>
        </div>
      )}

      {activeTab === "syllabus" && syllabus.length === 0 && (
        <div className="rounded-xl border bg-card p-5 flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-muted-foreground">{t("No syllabus topics added yet.")}</p>
          <Link href={`/batches/${id}/syllabus`} className="text-xs text-primary hover:underline">
            {t("Manage Syllabus →")}
          </Link>
        </div>
      )}

      {showEnrollModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowEnrollModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{t("Assign Student")}</h2>

            <select
              className="w-full rounded-lg border px-3 py-2"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">{t("Select Student")}</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.name) || s.name}
                </option>
              ))}
            </select>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="rounded-lg border px-4 py-2"
              >
                {t("Cancel")}
              </button>

              <button
                disabled={!selectedStudent}
                onClick={async () => {
                  await handleEnroll(selectedStudent);
                  setSelectedStudent("");
                  setShowEnrollModal(false);
                }}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              >
                {t("Assign")}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
