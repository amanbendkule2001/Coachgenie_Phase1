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

interface MonthlyFee {
  month: string;
  fees: number;
}

interface MonthlyTrendResponse {
  success: boolean;
  data: MonthlyFee[];
}

function formatCurrency(value: number | string | undefined) {
  const amount = Number(value ?? 0);

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }

  return `₹${amount}`;
}

export function FeeCollectionChart() {
  const [data, setData] = useState<MonthlyFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChart() {
      try {
        const response = await api.get<MonthlyTrendResponse>(
          "/fees/monthly-trend"
        );

        if (response.success && Array.isArray(response.data)) {
          setData(response.data);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Monthly Trend Error:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    loadChart();
  }, []);

  return (
    <div
      className="rounded-xl border bg-card p-5 shadow-sm fade-in"
      style={{ animationDelay: "120ms" }}
    >
      <div className="mb-4">
        <h3 className="font-semibold">Fee Collection</h3>
        <p className="text-xs text-muted-foreground">
          Monthly trend (current academic year)
        </p>
      </div>

      {loading ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground animate-pulse">
          Loading chart...
        </div>
      ) : data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
          No payment data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#2563eb"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="#2563eb"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tickFormatter={formatCurrency}
              domain={[0, "dataMax + 5000"]}
              allowDecimals={false}
              tickCount={6}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              formatter={(value) => [
                formatCurrency(value as number),
                "Collected Fees",
              ]}
            />

            <Area
              type="monotone"
              dataKey="fees"
              stroke="#2563eb"
              strokeWidth={3}
              fill="url(#feeGradient)"
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}