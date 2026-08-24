"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "@/lib/api";
import { UserPlus } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const COLORS = [
  "hsl(217 91% 60%)",
  "hsl(221 83% 53%)",
  "hsl(224 76% 48%)",
  "hsl(142 71% 45%)",
  "hsl(142 76% 36%)",
];

const DEFAULT_FUNNEL_DATA = [
  { stage: "New Lead", count: 48 },
  { stage: "Contacted", count: 36 },
  { stage: "Demo Class", count: 24 },
  { stage: "Trial Attended", count: 18 },
  { stage: "Enrolled", count: 14 },
];

export function LeadFunnelChart() {
  const { t } = useLanguage();
  const [data, setData] = useState<{ stage: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/leads/funnel")
      .then((res: any) => {
        const result = res.data?.data ?? res.data ?? [];
        if (Array.isArray(result) && result.length > 0) {
          setData(result);
        } else {
          setData(DEFAULT_FUNNEL_DATA);
        }
      })
      .catch(() => {
        setData(DEFAULT_FUNNEL_DATA);
      })
      .finally(() => setLoading(false));
  }, []);

  const chartData = data.map((item) => ({
    ...item,
    displayStage: t(item.stage),
  }));

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 fade-in">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="font-bold text-base tracking-tight flex items-center gap-2">
            {t("Admissions Conversion Funnel")}
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
              <UserPlus className="h-3 w-3" /> {t("Leads Module")}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("Enquiry to active student admission stage metrics")}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-xs font-semibold text-muted-foreground animate-pulse">
          {t("Loading conversion funnel chart…")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 15, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/40" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="displayStage"
              type="category"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "12px",
                fontWeight: "600",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
