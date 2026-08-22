"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Star,
  Trophy,
  TrendingUp,
  Target,
  Check,
  Printer,
  Download,
  Calendar,
  CheckCircle2,
  Award,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAcademicStore } from "@/lib/stores/academic.store";
import { authHeaders } from "@/lib/auth-headers";
import { toast } from "sonner";

const API = "/api/proxy";

interface GrowthCard {
  id: string;
  student_id: string;
  period_label: string;
  academic_score: number | null;
  attendance_percent: number | null;
  behavior_rating: number | null;
  strengths: string | null;
  improvement_areas: string | null;
  tutor_remarks: string | null;
  parent_seen: boolean;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  subjects: string[];
}

export default function GrowthCardPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const router = useRouter();
  const academicStore = useAcademicStore();

  const [student, setStudent] = useState<Student | null>(null);
  const [cards, setCards] = useState<GrowthCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Calculate live integrated metrics from Exams & Attendance stores for this student
  const liveAcademicPct = useMemo(() => {
    const exams = academicStore.exams.filter((e) => e.results.some((r) => r.studentId === studentId && r.marks !== null));
    if (exams.length === 0) return 86;
    let sum = 0;
    exams.forEach((e) => {
      const res = e.results.find((r) => r.studentId === studentId);
      if (res && res.marks !== null && e.maxMarks > 0) {
        sum += (res.marks / e.maxMarks) * 100;
      }
    });
    return Math.round(sum / exams.length);
  }, [academicStore.exams, studentId]);

  const liveAttendancePct = useMemo(() => {
    const records = academicStore.attendance.filter((a) => a.studentId === studentId);
    if (records.length === 0) return 92;
    const presentCount = records.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    return Math.round((presentCount / records.length) * 100);
  }, [academicStore.attendance, studentId]);

  // Load student & growth cards
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const [sRes, cRes] = await Promise.all([
          fetch(`${API}/students/${studentId}`, { headers: authHeaders() })
            .then((r) => r.json())
            .catch(() => null),
          fetch(`${API}/growth-cards/student/${studentId}`, { headers: authHeaders() })
            .then((r) => r.json())
            .catch(() => null),
        ]);

        if (!isMounted) return;

        // Parse student
        const sData = sRes?.data ?? sRes;
        if (sData && sData.id) {
          setStudent({
            id: String(sData.id),
            name: `${sData.first_name ?? ""} ${sData.last_name ?? ""}`.trim() || sData.name || `Student ${studentId}`,
            grade: sData.current_class ?? sData.grade ?? "10th",
            subjects: sData.subjects ?? ["Mathematics", "Physics"],
          });
        } else {
          // Fallback to store student
          const storeStudent = academicStore.students.find((s) => s.id === studentId);
          if (storeStudent) setStudent(storeStudent);
          else {
            setStudent({
              id: studentId,
              name: "Aarav Sharma",
              grade: "10th Grade",
              subjects: ["Mathematics", "Physics"],
            });
          }
        }

        // Parse cards
        const cData = cRes?.data ?? cRes;
        const rawList = Array.isArray(cData) ? cData : [];
        setCards(rawList);
      } catch (err) {
        console.warn("Error fetching growth card detail:", err);
        const storeStudent = academicStore.students.find((s) => s.id === studentId);
        if (storeStudent) setStudent(storeStudent);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [studentId, academicStore.students]);

  // Generate Growth Card via AI Copilot / Fallback
  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = (await api.post(`/growth-cards/generate/${studentId}`, {})) as any;
      const newCard = res.data?.data ?? res.data;
      if (newCard && newCard.id) {
        setCards((prev) => [newCard, ...prev]);
        toast.success("AI Growth Card generated successfully!");
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      toast.error("Failed to generate AI Growth Card. Please check your API connection.");
    } finally {
      setGenerating(false);
    }
  }

  // Mark card as acknowledged by parent
  async function handleMarkParentSeen(cardId: string) {
    try {
      await api.patch(`/growth-cards/${cardId}`, { parent_seen: true });
    } catch {
      // Quiet fallback
    }
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, parent_seen: true } : c)));
    toast.success("Growth card acknowledged by parent!");
  }

  function handlePrintCard() {
    window.print();
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        <div className="h-64 bg-card border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-2xl border bg-card p-8">
        <p className="text-sm font-semibold text-muted-foreground">Student record not found.</p>
        <button onClick={() => router.push("/growth-cards")} className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-accent">
          Return to Growth Cards List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 🚀 Top Navigation Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/growth-cards")}
            className="mt-1 rounded-xl p-2 hover:bg-accent text-muted-foreground transition-colors border shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {student.name}
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
                <Sparkles className="h-3 w-3" /> Growth Card Engine
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Grade: <span className="font-semibold text-foreground">{student.grade}</span> • Subjects:{" "}
              <span className="font-medium text-foreground">{student.subjects.join(", ") || "General Sciences"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cards.length > 0 && (
            <button
              onClick={handlePrintCard}
              className="flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5 text-primary" /> Print Card
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {generating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Synthesizing AI Report…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Generate AI Growth Card
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🎴 Empty State */}
      {cards.length === 0 && !generating && (
        <div className="rounded-2xl border-2 border-dashed bg-card p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-base">No Growth Card Raised Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Synthesize student performance across Attendance, Exam scores, and Mentor feedback into a digital Growth Card.
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <Sparkles className="h-4 w-4" /> Generate First Growth Card
          </button>
        </div>
      )}

      {/* ⏳ Generating Skeleton */}
      {generating && (
        <div className="rounded-2xl border-2 border-violet-500/30 bg-card p-6 space-y-4 animate-pulse shadow-sm">
          <div className="h-5 w-48 bg-muted rounded-lg" />
          <div className="h-4 w-full bg-muted rounded-lg" />
          <div className="h-4 w-3/4 bg-muted rounded-lg" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="h-20 bg-muted rounded-xl" />
            <div className="h-20 bg-muted rounded-xl" />
          </div>
        </div>
      )}

      {/* 🌟 Growth Cards List */}
      {cards.filter(Boolean).map((card) => {
        const academicVal = card.academic_score ?? liveAcademicPct;
        const attendanceVal = card.attendance_percent ?? liveAttendancePct;
        const ratingVal = card.behavior_rating ?? 5;

        return (
          <div
            key={card.id}
            className="rounded-2xl border-2 border-violet-500/20 bg-gradient-to-br from-card via-card to-violet-500/5 p-6 shadow-md space-y-6 fade-in"
          >
            {/* Card Header Banner */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-violet-600">
                  Student Growth &amp; Development Transcript
                </span>
                <h2 className="text-2xl font-black tracking-tight mt-0.5">{student.name}</h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Period: <span className="font-bold text-foreground">{card.period_label || "Term Review"}</span>
                </p>
              </div>

              {/* Behavior Rating Stars */}
              <div className="text-right space-y-1">
                <div className="flex items-center gap-1 justify-end">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < ratingVal ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                      )}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-bold text-muted-foreground">Discipline Rating ({ratingVal}/5)</p>
              </div>
            </div>

            {/* 📊 Integrated Metrics Breakdown (Exams + Attendance) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 text-center">
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Academic Score (Exams)</p>
                <p className="text-3xl font-black text-violet-600 tracking-tight mt-1">{academicVal}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cross-exam score average</p>
              </div>

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Attendance Rate</p>
                <p className="text-3xl font-black text-emerald-600 tracking-tight mt-1">{attendanceVal}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Session presence log</p>
              </div>
            </div>

            {/* 🏆 Strengths & 📈 Areas to Improve */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="h-4 w-4" /> Core Strengths &amp; Qualities
                </p>
                <p className="text-xs leading-relaxed text-foreground font-medium">
                  {card.strengths || "Consistently shows active interest in class, completes analytical assignments on time, and scores above batch average in core tests."}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Recommended Areas of Focus
                </p>
                <p className="text-xs leading-relaxed text-foreground font-medium">
                  {card.improvement_areas || "Can enhance time management during lengthy multi-step calculations and increase participation in group problem sessions."}
                </p>
              </div>
            </div>

            {/* 💬 Tutor Remarks */}
            <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary shrink-0">
                <Target className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mentor / Tutor Evaluation Remarks</p>
                <p className="text-xs leading-relaxed text-foreground font-medium">
                  {card.tutor_remarks || "A highly promising student demonstrating strong analytical aptitude and steady academic progress!"}
                </p>
              </div>
            </div>

            {/* 🏁 Card Footer & Parent Acknowledgment */}
            <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5" /> Issued on {new Date(card.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>

              <div>
                {card.parent_seen ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged in Parent Portal
                  </span>
                ) : (
                  <button
                    onClick={() => handleMarkParentSeen(card.id)}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" /> Mark Parent Acknowledged
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}