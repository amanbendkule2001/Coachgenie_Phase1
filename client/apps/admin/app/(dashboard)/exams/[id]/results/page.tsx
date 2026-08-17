"use client";
import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAcademicStore } from "@/lib/stores/academic.store";
import { BulkResultEntry } from "@/components/exams/BulkResultEntry";
import { useBulkResultEntry } from "@/hooks/useBulkResultEntry";
import type { ExamResult, Student } from "@/lib/types/academic";
import { authHeaders } from "@/lib/auth-headers";

const API = "/api/proxy";

const DEFAULT_FALLBACK_STUDENTS: Student[] = [
  { id: "s-001", name: "Aarav Sharma", grade: "10th", email: "aarav@example.com", phone: "9876543210", parentName: "Suresh Sharma", parentPhone: "9876543211", subjects: ["Math", "Physics"], batchIds: ["b-001"], status: "ACTIVE", address: "Mumbai", dob: "2008-05-15", joinedAt: "2024-06-01", fees: { total: 48000, paid: 48000, due: 0 } },
  { id: "s-002", name: "Sneha Joshi", grade: "10th", email: "sneha@example.com", phone: "9876543212", parentName: "Ramesh Joshi", parentPhone: "9876543213", subjects: ["Math", "Biology"], batchIds: ["b-001", "b-003"], status: "ACTIVE", address: "Pune", dob: "2008-08-20", joinedAt: "2024-06-01", fees: { total: 54000, paid: 27000, due: 27000 } },
  { id: "s-003", name: "Rohan Mehta", grade: "10th", email: "rohan@example.com", phone: "9876543214", parentName: "Vikram Mehta", parentPhone: "9876543215", subjects: ["Math"], batchIds: ["b-001"], status: "ACTIVE", address: "Mumbai", dob: "2008-03-10", joinedAt: "2024-06-01", fees: { total: 48000, paid: 48000, due: 0 } },
  { id: "s-004", name: "Priya Patel", grade: "10th", email: "priya@example.com", phone: "9876543216", parentName: "Anil Patel", parentPhone: "9876543217", subjects: ["Physics", "Chemistry"], batchIds: ["b-002"], status: "ACTIVE", address: "Thane", dob: "2008-11-05", joinedAt: "2024-06-15", fees: { total: 48000, paid: 24000, due: 24000 } },
  { id: "s-005", name: "Ananya Iyer", grade: "10th", email: "ananya@example.com", phone: "9876543218", parentName: "Srinivas Iyer", parentPhone: "9876543219", subjects: ["Math"], batchIds: ["b-001"], status: "ACTIVE", address: "Mumbai", dob: "2008-01-25", joinedAt: "2024-06-01", fees: { total: 48000, paid: 48000, due: 0 } },
];

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const store   = useAcademicStore();
  const exam    = store.exams.find(e => e.id === id);

  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [fetchedStudents, setFetchedStudents] = useState<Student[]>([]);

  const batch = store.batches.find(b => b.id === exam?.batchId);

  // Fetch students from API if needed
  useEffect(() => {
    if (!exam) return;
    let isMounted = true;
    setLoadingStudents(true);

    const endpoint = exam.batchId ? `${API}/batches/${exam.batchId}/students` : `${API}/students`;

    fetch(endpoint, { headers: authHeaders() })
      .then(r => r.json())
      .then(json => {
        if (!isMounted) return;
        const list = Array.isArray(json) ? json : json.data ?? [];
        if (Array.isArray(list) && list.length > 0) {
          const mapped: Student[] = list.map((s: any) => ({
            id: String(s.id),
            name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || `Student ${s.id}`,
            grade: s.current_class ?? s.grade ?? "10th",
            email: s.email ?? "",
            phone: s.phone ?? "",
            parentName: s.parent_name ?? "",
            parentPhone: s.parent_phone ?? "",
            subjects: s.subjects ?? [],
            batchIds: s.batch_ids ?? (exam.batchId ? [exam.batchId] : []),
            status: "ACTIVE",
            address: s.address ?? "",
            dob: s.date_of_birth ?? "",
            joinedAt: s.created_at ?? new Date().toISOString(),
            fees: { total: 0, paid: 0, due: 0 }
          }));
          setFetchedStudents(mapped);
        }
      })
      .catch(err => {
        console.warn("Failed to fetch students from API for exam results:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingStudents(false);
      });

    return () => { isMounted = false; };
  }, [exam?.batchId, exam?.id]);

  // Determine active student list
  const students = useMemo(() => {
    if (!exam) return [];

    // 1. Check fetched API students
    if (fetchedStudents.length > 0) return fetchedStudents;

    // 2. Check store students
    const storeFiltered = store.students.filter(s =>
      (batch?.studentIds && batch.studentIds.length > 0 && batch.studentIds.includes(s.id)) ||
      (s.batchIds && s.batchIds.length > 0 && exam.batchId && s.batchIds.includes(exam.batchId))
    );
    if (storeFiltered.length > 0) return storeFiltered;
    if (store.students.length > 0) return store.students;

    // 3. Fallback default students
    return DEFAULT_FALLBACK_STUDENTS;
  }, [exam, batch, fetchedStudents, store.students]);

  // Build initial result state for bulk entry
  const initial: ExamResult[] = useMemo(() => {
    return students.map(s => ({
      studentId: s.id,
      marks: exam?.results?.find(r => r.studentId === s.id)?.marks ?? null,
    }));
  }, [students, exam?.results]);

  const { results, update, dirty, reset } = useBulkResultEntry(initial);

  // Sync results state when initial changes
  useEffect(() => {
    if (!dirty && initial.length > 0) {
      reset(initial);
    }
  }, [initial, dirty, reset]);

  if (!exam) return null;

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    store.saveResults(id, results);
    setSaving(false);
    toast.success("Results saved and ranked!");
    router.push(`/exams/${id}`);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href={`/exams/${id}`} className="mt-1 rounded-lg p-2 hover:bg-accent text-muted-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Enter Results</h1>
            <p className="text-sm text-muted-foreground">{exam.name} · Max {exam.maxMarks} marks</p>
          </div>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={() => reset(initial)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {saving ? "Saving…" : <><Save className="h-4 w-4" /> Save & Rank</>}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Enter marks for each student. Leave blank for absent/not evaluated. Click "Save & Rank" to auto-calculate rankings and percentiles.
        </p>
        {loadingStudents && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse ml-2 shrink-0">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading students…
          </span>
        )}
      </div>

      <BulkResultEntry students={students} results={results} maxMarks={exam.maxMarks} onUpdate={update} />
    </div>
  );
}

