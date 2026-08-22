"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Award, TrendingUp, Sparkles, Printer, CheckCircle2, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAcademicStore } from "@/lib/stores/academic.store";
import { RankTable } from "@/components/exams/RankTable";
import type { Student } from "@/lib/types/academic";
import { authHeaders } from "@/lib/auth-headers";

const API = "/api/proxy";

const DEFAULT_FALLBACK_STUDENTS: Student[] = [];

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useAcademicStore();
  const exam = store.exams.find((e) => e.id === id);
  const [fetchedStudents, setFetchedStudents] = useState<Student[]>([]);
  const batch = store.batches.find((b) => b.id === exam?.batchId);

  useEffect(() => {
    if (!exam) return;
    let isMounted = true;
    const endpoint = exam.batchId ? `${API}/batches/${exam.batchId}/students` : `${API}/students`;

    fetch(endpoint, { headers: authHeaders() })
      .then((r) => r.json())
      .then((json) => {
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
            fees: { total: 0, paid: 0, due: 0 },
          }));
          setFetchedStudents(mapped);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [exam?.batchId, exam?.id]);

  const students = useMemo(() => {
    if (!exam) return [];
    if (fetchedStudents.length > 0) return fetchedStudents;
    const storeFiltered = store.students.filter(
      (s) =>
        (batch?.studentIds && batch.studentIds.includes(s.id)) ||
        (s.batchIds && exam.batchId && s.batchIds.includes(exam.batchId))
    );
    if (storeFiltered.length > 0) return storeFiltered;
    if (store.students.length > 0) return store.students;

    return DEFAULT_FALLBACK_STUDENTS;
  }, [exam, batch, fetchedStudents, store.students]);

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-2xl border bg-card p-8 text-center">
        <p className="text-base font-bold">Examination record not found.</p>
        <button onClick={() => router.push("/exams")} className="text-xs font-semibold text-primary hover:underline">
          ← Return to Exam Catalog
        </button>
      </div>
    );
  }

  const hasResults = exam.results?.length > 0 && exam.results.some((r) => r.marks !== null);

  const avg = hasResults
    ? Math.round(exam.results.filter((r) => r.marks !== null).reduce((a, b) => a + (b.marks ?? 0), 0) / exam.results.filter((r) => r.marks !== null).length)
    : null;
  const highest = hasResults ? Math.max(...exam.results.filter((r) => r.marks !== null).map((r) => r.marks!)) : null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 🚀 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/exams")}
            className="mt-1 rounded-xl p-2 hover:bg-accent text-muted-foreground transition-colors border shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {exam.name}
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                <Sparkles className="h-3 w-3" /> Published Scorecard
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Subject: <span className="font-semibold text-foreground">{exam.subject}</span> • Batch:{" "}
              <span className="font-semibold text-foreground">{batch?.name || "10th Science Batch A"}</span> • Date:{" "}
              <span className="font-semibold text-foreground">{exam.date ? format(new Date(exam.date), "dd MMM yyyy") : "—"}</span> • Duration:{" "}
              <span className="font-semibold text-foreground">{exam.duration} mins</span> • Max Marks:{" "}
              <span className="font-semibold text-foreground">{exam.maxMarks}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 text-primary" /> Print Rank Sheet
          </button>

          <Link
            href={`/exams/${id}/results`}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            <ClipboardList className="h-4 w-4" />
            {hasResults ? "Edit Student Marks" : "Enter Bulk Results"}
          </Link>
        </div>
      </div>

      {/* 📊 Performance Stat Cards */}
      {hasResults && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appeared Students</span>
            <p className="text-3xl font-extrabold tracking-tight">{exam.results.filter((r) => r.marks !== null).length}</p>
            <p className="text-xs text-muted-foreground">Scored in exam</p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class Average Score</span>
            <p className="text-3xl font-extrabold text-blue-600 tracking-tight">
              {avg !== null ? `${avg} / ${exam.maxMarks}` : "—"}
            </p>
            <p className="text-xs text-blue-600 font-medium">{avg !== null ? `${Math.round((avg / exam.maxMarks) * 100)}% Mean` : "Pending"}</p>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Score Rank #1</span>
            <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {highest !== null ? `${highest} / ${exam.maxMarks}` : "—"}
            </p>
            <p className="text-xs text-emerald-600 font-medium">Highest mark achieved</p>
          </div>
        </div>
      )}

      {/* 🏆 Rank Table & Scorecard */}
      {hasResults ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" /> Student Merit &amp; Rank Leaderboard
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">Sorted by Score %</span>
          </div>
          <RankTable students={students} results={exam.results} maxMarks={exam.maxMarks} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl border border-dashed bg-card text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold text-sm">No marks have been recorded for this exam yet.</p>
          <Link
            href={`/exams/${id}/results`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm"
          >
            Enter Student Results Now →
          </Link>
        </div>
      )}
    </div>
  );
}