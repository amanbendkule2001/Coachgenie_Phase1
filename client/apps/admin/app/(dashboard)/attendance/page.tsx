"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import {
  Save,
  CheckCircle2,
  FileText,
  CalendarDays,
  Users,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAcademicStore } from "@/lib/stores/academic.store";
import { AttendanceGrid } from "@/components/attendance/AttendanceGrid";
import { useAttendanceSession } from "@/hooks/useAttendanceSession";
import { authHeaders } from "@/lib/auth-headers";
import { copilotApi } from "@/lib/copilot-api";
import { cn } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

const API = "/api/proxy";

/* ───────────────────────── SESSION COMPONENT ───────────────────────── */

function AttendanceSession({ batchId, date }: { batchId: string; date: string }) {
  const store = useAcademicStore();
  const batch = store.batches.find((b) => b.id === batchId);

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    setLoadingStudents(true);

    Promise.all([
      fetch(`${API}/batches/${batchId}/students`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((json) => (Array.isArray(json) ? json : json.data ?? []))
        .catch(() => []),

      fetch(`${API}/batches/${batchId}/classes`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((json) => (Array.isArray(json) ? json : json.data ?? []))
        .catch(() => []),
    ])
      .then(([rawStudents, rawClasses]) => {
        setStudents(
          rawStudents.map((s: any) => ({
            id: String(s.id),
            name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || `Student ${s.id}`,
            grade: s.current_class ?? s.grade ?? "",
          }))
        );

        if (Array.isArray(rawClasses) && rawClasses.length > 0) {
          setClasses(rawClasses);
          setSelectedClassId(String(rawClasses[0].id));
        } else {
          const fallbackClass = [{ id: `cls-${batchId}-${date}`, title: "Regular Class Session" }];
          setClasses(fallbackClass);
          setSelectedClassId(fallbackClass[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed loading session data:", err);
        const fallbackClass = [{ id: `cls-${batchId}-${date}`, title: "Regular Class Session" }];
        setClasses(fallbackClass);
        setSelectedClassId(fallbackClass[0].id);
      })
      .finally(() => setLoadingStudents(false));
  }, [batchId, date]);

  const { entries, mark, markAll, save, saved, saving } =
    useAttendanceSession(students.map((s) => s.id));

  async function handleSave() {
    const activeClassId = selectedClassId || (classes.length > 0 ? String(classes[0].id) : `cls-${batchId}-${date}`);

    try {
      await save(async (data) => {
        try {
          await api.post("/attendance/", {
            class_id: activeClassId,
            session_date: date,
            records: data.map((e) => ({
              student_id: e.studentId,
              status: e.status.toLowerCase(),
              remarks: e.note ?? null,
            })),
          });
        } catch (apiErr) {
          console.warn("Backend API attendance save fallback to store:", apiErr);
        }

        store.markAttendance(
          data.map((e) => ({
            studentId: e.studentId,
            batchId,
            date,
            status: e.status as AttendanceStatus,
          }))
        );
      });

      toast.success("Attendance saved successfully!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save attendance");
    }
  }

  if (loadingStudents) {
    return (
      <div className="rounded-2xl border bg-card p-10 flex flex-col items-center justify-center gap-3 animate-pulse">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading batch students & class schedule…</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
        <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <p className="font-semibold text-base">No Enrolled Students</p>
        <p className="text-sm text-muted-foreground">
          There are no active students enrolled in this batch yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">{batch?.name}</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {students.length} Enrolled
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Session Date: <span className="font-medium text-foreground">{format(new Date(date), "EEEE, dd MMMM yyyy")}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {classes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Class Slot:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-9 rounded-lg border bg-background px-3 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              >
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all shadow-sm",
              saved
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Attendance
              </>
            )}
          </button>
        </div>
      </div>

      <AttendanceGrid
        students={students}
        entries={entries}
        onMark={mark}
        onMarkAll={markAll}
      />
    </div>
  );
}

/* ───────────────────────── MAIN PAGE ───────────────────────── */

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const { batches, setBatches } = useAcademicStore();

  const paramBatchId = searchParams.get("batchId") ?? "";
  const paramDate = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

  const [selectedBatch, setSelectedBatch] = useState("");
  const [date, setDate] = useState(paramDate);
  const [started, setStarted] = useState(Boolean(paramBatchId));
  const [exportingReport, setExportingReport] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch(`${API}/batches/`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error("Failed to fetch batches");

      const json = await res.json();
      const raw = Array.isArray(json) ? json : json.data ?? json.items ?? [];

      const mapped = raw.map((b: any) => ({
        id: String(b.id),
        name: b.name ?? "",
        subject: b.target_exam ?? b.code ?? "",
        status: b.is_active === false ? "COMPLETED" : "ACTIVE",
      }));

      setBatches(mapped);

      if (mapped.length > 0) {
        setSelectedBatch(paramBatchId || mapped[0].id);
      }
    } catch (err) {
      console.error("Batch fetch failed", err);
    }
  }, [setBatches, paramBatchId]);

  useEffect(() => {
    if (!batches || batches.length === 0) {
      fetchBatches();
    } else {
      setSelectedBatch(paramBatchId || batches[0]?.id || "");
    }
  }, []);

  function handleBatchChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedBatch(e.target.value);
    setStarted(false);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDate(e.target.value);
    setStarted(false);
  }

  function setQuickDate(offset: number) {
    const targetDate = format(subDays(new Date(), offset), "yyyy-MM-dd");
    setDate(targetDate);
    setStarted(false);
  }

  async function handleGenerateAttendanceReport() {
    if (!selectedBatch) {
      toast.error("Select a batch first");
      return;
    }

    setExportingReport(true);
    try {
      const res = await copilotApi.post("/reports/attendance-report", {
        batch_id: selectedBatch,
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${selectedBatch}_${date}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success("Attendance PDF report downloaded!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to export report");
    } finally {
      setExportingReport(false);
    }
  }

  const activeBatchObj = batches.find((b) => b.id === selectedBatch);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Attendance Manager
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Real-time
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select a batch and date to record daily student attendance or export reports
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/40">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Batches</p>
            <p className="text-xl font-bold">{batches.length}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/40">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Selected Batch</p>
            <p className="text-sm font-bold truncate max-w-[180px]">{activeBatchObj?.name || "None Selected"}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <div className="rounded-lg bg-violet-50 p-2.5 dark:bg-violet-950/40">
            <CheckSquare className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Session Status</p>
            <p className="text-sm font-bold text-violet-600">
              {started ? "Session Active" : "Ready to Start"}
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Session Configuration
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Batch Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Select Batch</label>
              <div className="relative">
                <select
                  value={selectedBatch}
                  onChange={handleBatchChange}
                  className="h-10 w-56 rounded-lg border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Attendance Date</label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={date}
                    onChange={handleDateChange}
                    className="h-10 rounded-lg border bg-background px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                {/* Date Quick Shortcuts */}
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className={cn(
                    "h-10 rounded-lg border px-3 text-xs font-medium transition-colors hover:bg-accent",
                    date === format(new Date(), "yyyy-MM-dd") && "bg-primary/10 border-primary/30 text-primary font-semibold"
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className={cn(
                    "h-10 rounded-lg border px-3 text-xs font-medium transition-colors hover:bg-accent",
                    date === format(subDays(new Date(), 1), "yyyy-MM-dd") && "bg-primary/10 border-primary/30 text-primary font-semibold"
                  )}
                >
                  Yesterday
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 sm:pt-0">
            {/* PDF Report Export */}
            <button
              onClick={handleGenerateAttendanceReport}
              disabled={exportingReport}
              className="flex items-center gap-1.5 rounded-lg border bg-background px-3.5 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {exportingReport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 text-emerald-600" />
              )}
              Export PDF
            </button>

            {/* Start / Continue Session */}
            <button
              onClick={() => setStarted(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>{started ? "Refresh Grid" : "Start Session"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Session Grid */}
      {started && selectedBatch && (
        <AttendanceSession
          key={`${selectedBatch}-${date}`}
          batchId={selectedBatch}
          date={date}
        />
      )}
    </div>
  );
}