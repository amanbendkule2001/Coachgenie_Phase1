"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CalendarDays,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";

interface DashboardData {
  total_students: number;
  active_batches: number;
  total_revenue: number;
  avg_attendance_percent: number;
}

interface DashboardOwnerResponse {
  success: boolean;
  data: DashboardData;
}

export function KpiCards() {
  const [data, setData] = useState<DashboardData>({
    total_students: 0,
    active_batches: 0,
    total_revenue: 0,
    avg_attendance_percent: 0,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await api.get<DashboardOwnerResponse>("/dashboard/owner");

        console.log("Dashboard Response:", res.data);

        setData(res.data);
      } catch (err) {
        console.error("Dashboard Error:", err);
      }
    };

    loadDashboard();
  }, []);

  const kpis = [
    {
      title: "Total Students",
      value: data.total_students,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "Active Batches",
      value: data.active_batches,
      icon: CalendarDays,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      title: "Fee Collected",
      value: `₹${data.total_revenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "Attendance Rate",
      value: `${data.avg_attendance_percent}%`,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.title}
          className="rounded-xl border bg-card p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </p>

            <div className={`rounded-lg p-2 ${kpi.bg}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
          </div>

          <p className="mt-3 text-2xl font-bold tracking-tight">
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}