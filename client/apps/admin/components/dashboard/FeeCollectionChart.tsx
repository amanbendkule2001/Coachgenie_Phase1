"use client";

import { useEffect, useState } from "react";
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
import { IndianRupee } from "lucide-react";

interface MonthlyFee {
  month: string;
  fees: number;
}

const DEFAULT_TREND_DATA: MonthlyFee[] = [
  { month: "Nov", fees: 125000 },
  { month: "Dec", fees: 140000 },
  { month: "Jan", fees: 165000 },
  { month: "Feb", fees: 150000 },
  { month: "Mar", fees: 184000 },
  { month: "Apr", fees: 210000 },
];

function formatCurrency(value: number | string | undefined) {
  const amount = Number(value ?? 0);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

export function FeeCollectionChart() {
  const [data, setData] = useState<MonthlyFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChart() {
      try {
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
        setData(DEFAULT_TREND_DATA);
      } finally {
        setLoading(false);
      }
    }

    loadChart();
  }, []);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 fade-in">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
            Fee Collection Trend
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <IndianRupee className="h-3 w-3" /> Financial Ledger
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue collection trends (academic year)</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[240px] flex items-center justify-center text-xs font-semibold text-muted-foreground animate-pulse">
          Loading financial trend chart…
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

            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />

            <YAxis
              tickFormatter={formatCurrency}
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
              formatter={(value) => [formatCurrency(value as number), "Revenue Collected"]}
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