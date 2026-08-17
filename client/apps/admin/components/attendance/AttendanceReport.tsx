"use client";

import { useState, useMemo } from "react";
import { format, eachDayOfInterval, subDays } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  TrendingUp,
  AlertTriangle,
  Search,
  Download,
  Users,
  Award,
  ArrowUpDown,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Student, AttendanceRecord } from "@/lib/types/academic";

interface AttendanceReportProps {
  students: Student[];
  records: AttendanceRecord[];
  startDate: Date;
  endDate: Date;
  batchName?: string;
}

export function AttendanceReport({
  students,
  records,
  startDate,
  endDate,
  batchName,
}: AttendanceReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HEALTHY" | "RISK">("ALL");
  const [sortBy, setSortBy] = useState<"pct" | "name" | "absent">("pct");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Last 7 days for mini-timeline dots
  const recentDays = useMemo(() => {
    const end = new Date(endDate);
    return Array.from({ length: 7 }, (_, i) => subDays(end, 6 - i));
  }, [endDate]);

  // Calculate accurate attendance stats for every student
  const studentStats = useMemo(() => {
    return students.map((student) => {
      // Find all attendance records for this student within date range
      const studentRecords = records.filter((r) => {
        if (!r.date || r.studentId !== student.id) return false;
        const recordDate = new Date(r.date.includes("T") ? r.date.split("T")[0]! : r.date);
        return recordDate >= startDate && recordDate <= endDate;
      });

      // Deduplicate by date if multiple entries exist
      const recordMap = new Map<string, string>();
      studentRecords.forEach((r) => {
        const dStr = r.date.includes("T") ? r.date.split("T")[0]! : r.date;
        recordMap.set(dStr, r.status.toUpperCase());
      });

      let present = 0;
      let absent = 0;
      let late = 0;
      let holiday = 0;

      recordMap.forEach((status) => {
        if (status === "PRESENT") present++;
        else if (status === "ABSENT") absent++;
        else if (status === "LATE") late++;
        else if (status === "HOLIDAY") holiday++;
      });

      const totalSessions = present + absent + late;
      // Formula: (Present + Late) / Total Sessions * 100
      const pct = totalSessions > 0 ? Math.round(((present + late) / totalSessions) * 100) : 100;

      // Status classification
      const healthStatus: "HEALTHY" | "WARNING" | "CRITICAL" =
        pct >= 75 ? "HEALTHY" : pct >= 50 ? "WARNING" : "CRITICAL";

      return {
        student,
        present,
        absent,
        late,
        holiday,
        totalSessions,
        pct,
        healthStatus,
        recordMap,
      };
    });
  }, [students, records, startDate, endDate]);

  // Aggregate Batch Overall KPIs
  const batchSummary = useMemo(() => {
    if (studentStats.length === 0) return { avgPct: 0, totalConduct: 0, healthyCount: 0, riskCount: 0 };

    const totalPctSum = studentStats.reduce((acc, s) => acc + s.pct, 0);
    const avgPct = Math.round(totalPctSum / studentStats.length);

    const maxSessions = Math.max(...studentStats.map((s) => s.totalSessions), 0);
    const healthyCount = studentStats.filter((s) => s.pct >= 75).length;
    const riskCount = studentStats.filter((s) => s.pct < 75).length;

    return {
      avgPct,
      totalConduct: maxSessions,
      healthyCount,
      riskCount,
    };
  }, [studentStats]);

  // Filter & Sort student list
  const filteredStudents = useMemo(() => {
    return studentStats
      .filter(({ student, pct }) => {
        const matchesSearch =
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.grade?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;
        if (statusFilter === "HEALTHY") return pct >= 75;
        if (statusFilter === "RISK") return pct < 75;
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === "pct") comp = b.pct - a.pct;
        else if (sortBy === "name") comp = a.student.name.localeCompare(b.student.name);
        else if (sortBy === "absent") comp = b.absent - a.absent;

        return sortOrder === "desc" ? comp : -comp;
      });
  }, [studentStats, searchTerm, statusFilter, sortBy, sortOrder]);

  // CSV Export function with Present, Absent, Late, Holiday
  function exportToCSV() {
    const headers = ["Student Name", "Grade", "Total Sessions", "Present", "Absent", "Late", "Holiday", "Attendance %", "Status"];
    const rows = filteredStudents.map(({ student, totalSessions, present, absent, late, holiday, pct, healthStatus }) => [
      `"${student.name}"`,
      `"${student.grade || ""}"`,
      totalSessions,
      present,
      absent,
      late,
      holiday,
      `${pct}%`,
      healthStatus,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${batchName || "Batch"}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function toggleSort(field: "pct" | "name" | "absent") {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  return (
    <div className="space-y-6">
      {/* 📊 Executive Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Average Attendance Rate */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average Attendance
            </span>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{batchSummary.avgPct}%</span>
            <span
              className={cn(
                "text-xs font-bold rounded-md px-1.5 py-0.5",
                batchSummary.avgPct >= 75 ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
              )}
            >
              {batchSummary.avgPct >= 75 ? "Healthy" : "Needs Focus"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Target threshold: <span className="font-semibold text-foreground">75.0%</span>
          </p>
        </div>

        {/* Card 2: Total Sessions Conducted */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions Recorded
            </span>
            <div className="rounded-full bg-blue-500/10 p-2 text-blue-600">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{batchSummary.totalConduct}</span>
            <span className="text-xs font-medium text-muted-foreground">sessions</span>
          </div>
          <p className="text-xs text-muted-foreground">
            In selected range ({format(startDate, "dd MMM")} - {format(endDate, "dd MMM")})
          </p>
        </div>

        {/* Card 3: Healthy Students */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On-Track (≥ 75%)
            </span>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
              {batchSummary.healthyCount}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              of {students.length} students
            </span>
          </div>
          <p className="text-xs text-emerald-600 font-medium">Meeting attendance requirement</p>
        </div>

        {/* Card 4: Low Attendance Warning */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low Attendance (&lt; 75%)
            </span>
            <div className="rounded-full bg-red-500/10 p-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-600 tracking-tight">
              {batchSummary.riskCount}
            </span>
            <span className="text-xs font-medium text-muted-foreground">students</span>
          </div>
          <p className="text-xs text-red-500 font-medium">Requires parent notification</p>
        </div>
      </div>

      {/* 🔍 Controls Toolbar */}
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
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all",
                statusFilter === "ALL" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({students.length})
            </button>
            <button
              onClick={() => setStatusFilter("HEALTHY")}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all",
                statusFilter === "HEALTHY" ? "bg-emerald-500/15 text-emerald-700 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Healthy ≥75%
            </button>
            <button
              onClick={() => setStatusFilter("RISK")}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all",
                statusFilter === "RISK" ? "bg-red-500/15 text-red-700 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Low Attendance
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 rounded-xl border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 📋 Accurate Attendance Breakdown Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                <th className="px-5 py-3.5 w-10">#</th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1">
                    Student Name <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">Sessions</th>
                <th className="px-4 py-3.5 text-center text-emerald-600">Present</th>
                <th className="px-4 py-3.5 text-center text-red-500">Absent</th>
                <th className="px-4 py-3.5 text-center text-amber-600">Late</th>
                <th className="px-4 py-3.5 text-center text-cyan-600">Holiday</th>
                <th className="px-4 py-3.5 text-center">Recent (7 Days)</th>
                <th className="px-5 py-3.5 cursor-pointer hover:text-foreground" onClick={() => toggleSort("pct")}>
                  <div className="flex items-center gap-1">
                    Attendance Rate % <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-semibold text-sm">No student attendance records match your filter.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(({ student, present, absent, late, holiday, totalSessions, pct, healthStatus, recordMap }, i) => (
                  <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{i + 1}</td>

                    {/* Student Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.grade || "Batch Student"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Total Sessions */}
                    <td className="px-4 py-3.5 text-center font-mono font-medium text-xs">
                      {totalSessions}
                    </td>

                    {/* Present */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> {present}
                      </span>
                    </td>

                    {/* Absent */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-600">
                        <XCircle className="h-3 w-3" /> {absent}
                      </span>
                    </td>

                    {/* Late */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                        <Clock className="h-3 w-3" /> {late}
                      </span>
                    </td>

                    {/* Holiday */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-bold text-cyan-600">
                        <Sun className="h-3 w-3" /> {holiday}
                      </span>
                    </td>

                    {/* Recent 7-Day Timeline Dots */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        {recentDays.map((day, idx) => {
                          const dStr = format(day, "yyyy-MM-dd");
                          const st = recordMap.get(dStr);

                          let bg = "bg-muted text-muted-foreground/40";
                          let title = `${format(day, "dd MMM")}: No Class`;
                          let letter = "•";

                          if (st === "PRESENT") {
                            bg = "bg-emerald-500 text-white";
                            title = `${format(day, "dd MMM")}: Present`;
                            letter = "P";
                          } else if (st === "ABSENT") {
                            bg = "bg-red-500 text-white";
                            title = `${format(day, "dd MMM")}: Absent`;
                            letter = "A";
                          } else if (st === "LATE") {
                            bg = "bg-amber-500 text-white";
                            title = `${format(day, "dd MMM")}: Late`;
                            letter = "L";
                          } else if (st === "HOLIDAY") {
                            bg = "bg-cyan-500 text-white";
                            title = `${format(day, "dd MMM")}: Holiday`;
                            letter = "H";
                          }

                          return (
                            <div
                              key={idx}
                              title={title}
                              className={cn("h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs transition-transform hover:scale-125", bg)}
                            >
                              {letter}
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Attendance Rate Progress Bar */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span
                            className={cn(
                              pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Health Status Badge */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                          healthStatus === "HEALTHY"
                            ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : healthStatus === "WARNING"
                            ? "bg-amber-500/15 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-red-500/15 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        )}
                      >
                        {healthStatus === "HEALTHY" && <CheckCircle2 className="h-3 w-3" />}
                        {healthStatus === "WARNING" && <Clock className="h-3 w-3" />}
                        {healthStatus === "CRITICAL" && <AlertTriangle className="h-3 w-3" />}
                        {healthStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
