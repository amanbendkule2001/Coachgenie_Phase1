"use client";

import { useEffect, useState, useMemo } from "react";
import { format, eachDayOfInterval, subDays, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Calendar } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const LEVELS = [
  "bg-muted/60",
  "bg-blue-500/30 dark:bg-blue-900/40",
  "bg-blue-500/60 dark:bg-blue-700/60",
  "bg-blue-600 dark:bg-blue-600",
  "bg-blue-700 dark:bg-blue-500",
];

export function AttendanceHeatmap() {
  const { t } = useLanguage();
  const [attendance, setAttendance] = useState<Record<string, number>>({});

  useEffect(() => {
    api
      .get("/attendance/heatmap")
      .then((res: any) => setAttendance(res.data?.data ?? res.data ?? {}))
      .catch(() => {
        setAttendance({});
      });
  }, []);

  const days = eachDayOfInterval({ start: subDays(new Date(), 180), end: new Date() });
  const padStart = getDay(days[0]!);
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(padStart).fill(null);
  days.forEach((d) => {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 fade-in">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="font-bold text-base tracking-tight flex items-center gap-2">
            {t("Institute Attendance Activity Matrix")}
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-600">
              <Calendar className="h-3 w-3" /> {t("Attendance Module")}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("Past 6-month daily session presence volume — darker cells indicate higher attendance")}</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="flex gap-1 mb-1 ml-8">
            {weeks.map((_, wi) => {
              const first = weeks[wi]?.find(Boolean);
              const label = first ? format(first, "MMM") : "";
              const prevLabel =
                wi > 0 && weeks[wi - 1]?.find(Boolean)
                  ? format(weeks[wi - 1]!.find(Boolean)!, "MMM")
                  : "";
              return (
                <div key={wi} className="w-3 text-[9px] font-bold text-muted-foreground">
                  {label !== prevLabel ? label : ""}
                </div>
              );
            })}
          </div>

          {/* Day rows */}
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, di) => (
            <div key={day} className="flex items-center gap-1">
              <span className="w-7 text-right text-[9px] font-bold text-muted-foreground shrink-0">
                {di % 2 === 1 ? day : ""}
              </span>
              {weeks.map((weekSlot, wi) => {
                const date = weekSlot[di];
                if (!date) return <div key={wi} className="h-3 w-3 rounded-xs bg-transparent" />;
                const key = format(date, "yyyy-MM-dd");
                const level = attendance[key] ?? 0;
                const safeLevel = Math.min(LEVELS.length - 1, level);
                return (
                  <div
                    key={wi}
                    title={`${format(date, "MMM dd, yyyy")}: ${level === 0 ? "No sessions" : `${level} class sessions logged`}`}
                    className={cn(
                      "h-3 w-3 rounded-xs transition-transform hover:scale-125 hover:z-10 cursor-pointer",
                      LEVELS[safeLevel]
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pt-2 border-t">
        <span>{t("Session Volume Legend")}</span>
        <div className="flex items-center gap-1.5">
          <span>{t("Fewer")}</span>
          {LEVELS.map((l, i) => (
            <div key={i} className={cn("h-3 w-3 rounded-xs", l)} />
          ))}
          <span>{t("More")}</span>
        </div>
      </div>
    </div>
  );
}
