
"use client";

import { useEffect, useState } from "react";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { FeeCollectionChart } from "@/components/dashboard/FeeCollectionChart";
import { LeadFunnelChart } from "@/components/dashboard/LeadFunnelChart";
import { AttendanceHeatmap } from "@/components/dashboard/AttendanceHeatmap";
import { AnalyticsChatBubble } from "@/components/ai/AnalyticsChatBubble";

export default function DashboardPage() {
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    try {
      const data = localStorage.getItem("coachgenie-ui");

      if (!data) return;

      const parsed = JSON.parse(data);

      const user = parsed?.state?.user;

      if (user) {
        setUserName(
          `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
        );
      }
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {userName}. Here's what's happening today.
        </p>
      </div>

      <KpiCards />

      <div className="grid gap-4 lg:grid-cols-2">
        <FeeCollectionChart />
        <LeadFunnelChart />
      </div>

      <AttendanceHeatmap />

      <AnalyticsChatBubble />
    </div>
  );
}