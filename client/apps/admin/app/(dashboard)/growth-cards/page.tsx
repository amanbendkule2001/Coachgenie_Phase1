"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  Plus,
  Award,
  Search,
  BookOpen,
  TrendingUp,
  Users,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  Star,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAcademicStore } from "@/lib/stores/academic.store";
import { authHeaders } from "@/lib/auth-headers";
import { toast } from "sonner";

const API = "/api/proxy";

interface Student {
  id: string;
  name: string;
  grade: string;
  subjects: string[];
}

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

const DEFAULT_FALLBACK_STUDENTS: Student[] = [];

export default function GrowthCardsPage() {
  const academicStore = useAcademicStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [cards, setCards] = useState<Record<string, GrowthCard[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "GENERATED" | "PENDING">("ALL");

  // Load students & growth cards from API and local store
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const [sRes, cRes] = await Promise.all([
          fetch(`${API}/students/`, { headers: authHeaders() })
            .then((r) => r.json())
            .catch(() => null),
          fetch(`${API}/growth-cards/`, { headers: authHeaders() })
            .then((r) => r.json())
            .catch(() => null),
        ]);

        if (!isMounted) return;

        // Parse students
        const rawStudents = Array.isArray(sRes) ? sRes : sRes?.data ?? [];
        if (Array.isArray(rawStudents)) {
          setStudents(
            rawStudents.map((s: any) => ({
              id: String(s.id),
              name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || `Student ${s.id}`,
              grade: s.current_class ?? s.grade ?? "10th",
              subjects: s.subjects ?? [],
            }))
          );
        } else if (academicStore.students.length > 0) {
          setStudents(academicStore.students);
        } else {
          setStudents([]);
        }

        // Parse growth cards
        const rawCards = Array.isArray(cRes) ? cRes : cRes?.data ?? [];
        const byStudent: Record<string, GrowthCard[]> = {};

        if (Array.isArray(rawCards)) {
          rawCards.forEach((c: GrowthCard) => {
            const sid = String(c.student_id);
            if (!byStudent[sid]) byStudent[sid] = [];
            byStudent[sid].push(c);
          });

          // Sort latest first
          Object.keys(byStudent).forEach((sid) => {
            byStudent[sid]!.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }

        setCards(byStudent);
      } catch (err) {
        console.warn("Failed fetching growth cards from API:", err);
        if (academicStore.students.length > 0) setStudents(academicStore.students);
        else setStudents([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [academicStore.students]);

  // Aggregate Executive Growth KPIs
  const kpiStats = useMemo(() => {
    const totalStudents = students.length;
    let totalGeneratedCount = 0;
    let totalScoreSum = 0;
    let scoreCount = 0;
    let parentSeenCount = 0;

    students.forEach((s) => {
      const sCards = cards[s.id] ?? [];
      if (sCards.length > 0) {
        totalGeneratedCount++;
        const latest = sCards[0]!;
        if (typeof latest.academic_score === "number") {
          totalScoreSum += latest.academic_score;
          scoreCount++;
        }
        if (latest.parent_seen) parentSeenCount++;
      }
    });

    const avgAcademicScore = scoreCount > 0 ? Math.round(totalScoreSum / scoreCount) : 0;
    const parentSeenPct = totalGeneratedCount > 0 ? Math.round((parentSeenCount / totalGeneratedCount) * 100) : 0;

    return {
      totalStudents,
      totalGeneratedCount,
      avgAcademicScore,
      parentSeenPct,
    };
  }, [students, cards]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.grade.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const hasCards = (cards[student.id] ?? []).length > 0;
      if (filterType === "GENERATED") return hasCards;
      if (filterType === "PENDING") return !hasCards;

      return true;
    });
  }, [students, cards, searchTerm, filterType]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 🚀 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Growth Cards &amp; Holistic Mentorship
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> AI Copilot Insights
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cross-module student growth tracking: Academic scores, attendance, behavior ratings, and AI recommendations
          </p>
        </div>
      </div>

      {/* 📊 Executive Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Students</span>
            <div className="rounded-full bg-blue-500/10 p-2 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold tracking-tight">{kpiStats.totalStudents}</p>
          <p className="text-xs text-muted-foreground">Active student profiles</p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Growth Cards Raised</span>
            <div className="rounded-full bg-violet-500/10 p-2 text-violet-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-violet-600 tracking-tight">{kpiStats.totalGeneratedCount}</p>
          <p className="text-xs text-muted-foreground">Generated via AI Copilot</p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch Avg Academic Score</span>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{kpiStats.avgAcademicScore}%</p>
          <p className="text-xs text-emerald-600 font-medium">Cross-exam performance</p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parent View Rate</span>
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{kpiStats.parentSeenPct}%</p>
          <p className="text-xs text-muted-foreground">Acknowledged in Parent Portal</p>
        </div>
      </div>

      {/* 🔍 Search & Filter Toolbar */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student name or grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full rounded-xl border bg-background pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border text-xs">
            <button
              onClick={() => setFilterType("ALL")}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all",
                filterType === "ALL" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setFilterType("GENERATED")}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all",
                filterType === "GENERATED" ? "bg-violet-500/15 text-violet-700 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Cards Raised ({kpiStats.totalGeneratedCount})
            </button>
            <button
              onClick={() => setFilterType("PENDING")}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all",
                filterType === "PENDING" ? "bg-amber-500/15 text-amber-700 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Pending Cards ({students.length - kpiStats.totalGeneratedCount})
            </button>
          </div>
        </div>
      </div>

      {/* 🚀 Skeleton Loading State */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-card border p-5 animate-pulse space-y-3">
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        /* 🎴 Student Growth Card Grid */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student, i) => {
            const studentCards = cards[student.id] ?? [];
            const latest = studentCards[0];

            // Real-time score fallbacks linked from Exams & Attendance modules
            const avgScore = typeof latest?.academic_score === "number" ? latest.academic_score : 0;
            const attPct = typeof latest?.attendance_percent === "number" ? latest.attendance_percent : 0;
            const behaviorRating = latest?.behavior_rating ?? 0;

            return (
              <Link
                key={student.id}
                href={`/growth-cards/${student.id}`}
                className="rounded-2xl border bg-card p-5 hover:shadow-lg hover:border-primary/40 transition-all group fade-in flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Header: Student Name & Avatar */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {student.grade || "10th"} Grade
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                  </div>

                  {/* Cross-Module Integration Indicators */}
                  <div className="space-y-2 pt-1 border-t">
                    {/* Academic Performance (Exams Module) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Academic Average (Exams)</span>
                        <span
                          className={cn(
                            "font-bold",
                            avgScore >= 75
                              ? "text-emerald-600 dark:text-emerald-400"
                              : avgScore >= 50
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-500"
                          )}
                        >
                          {avgScore}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            avgScore >= 75 ? "bg-emerald-500" : avgScore >= 50 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${avgScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Attendance Rate (Attendance Module) */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">Attendance Rate</span>
                      <span className="font-semibold text-violet-600 dark:text-violet-400">{attPct}%</span>
                    </div>

                    {/* Behavior Rating Star Rating */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">Behavior / Discipline</span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={cn(
                                "h-3 w-3",
                                idx < behaviorRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] ml-0.5">({behaviorRating}/5)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Status Bar */}
                <div className="flex items-center justify-between text-xs pt-3 border-t text-muted-foreground">
                  <span className="font-medium">
                    {studentCards.length} {studentCards.length === 1 ? "Card" : "Cards"} Raised
                  </span>
                  <span className="flex items-center gap-1 text-primary font-bold group-hover:underline">
                    {studentCards.length > 0 ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5" /> View Card →
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Generate AI Card ✨
                      </>
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}