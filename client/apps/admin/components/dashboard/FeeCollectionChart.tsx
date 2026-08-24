"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { IndianRupee, TrendingUp, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface MonthlyFee {
  month: string;
  fees: number;
}

const DEFAULT_TREND_DATA: MonthlyFee[] = [
  { month: "Sep", fees: 0 },
  { month: "Oct", fees: 0 },
  { month: "Nov", fees: 0 },
  { month: "Dec", fees: 0 },
  { month: "Jan", fees: 0 },
  { month: "Feb", fees: 0 },
  { month: "Mar", fees: 0 },
  { month: "Apr", fees: 0 },
  { month: "May", fees: 0 },
  { month: "Jun", fees: 0 },
  { month: "Jul", fees: 0 },
  { month: "Aug", fees: 0 },
];

function formatCurrencyAxis(value: number | string | undefined) {
  const amount = Number(value ?? 0);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

function formatExactCurrency(value: number | string | undefined) {
  const amount = Number(value ?? 0);
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function FeeCollectionChart() {
  const { t } = useLanguage();
  const [data, setData] = useState<MonthlyFee[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChart = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = (await api.get<any>("/fees/monthly-trend")) as any;
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      if (list.length > 0) {
        setData(list);
      } else {
        setData(DEFAULT_TREND_DATA);
      }
    } catch {
      setData((prev) => (prev.length > 0 ? prev : DEFAULT_TREND_DATA));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChart(false);
  }, [loadChart]);

  const totalCollected = useMemo(() => {
    return data.reduce((acc, curr) => acc + (Number(curr.fees) || 0), 0);
  }, [data]);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="font-bold text-base tracking-tight flex items-center gap-2">
            {t("Fee Collection Trend")}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <IndianRupee className="h-3 w-3" /> {t("Financial Ledger")}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("Monthly revenue collection trends (academic year)")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {t("Total Collected")}
            </p>
            <p className="text-sm font-extrabold text-emerald-600">
              {formatExactCurrency(totalCollected)}
            </p>
          </div>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-xs font-semibold text-muted-foreground animate-pulse">
          {t("Loading financial trend chart…")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/40" />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tickFormatter={formatCurrencyAxis}
              allowDecimals={false}
              tickCount={5}
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
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
              formatter={(value) => [formatExactCurrency(value as number), "Revenue Collected"]}
            />

            <Area
              type="monotone"
              dataKey="fees"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#feeGradient)"
              activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}