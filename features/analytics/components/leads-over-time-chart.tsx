"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LeadsOverTimePoint } from "../analytics";

export function LeadsOverTimeChart({
  data,
  error,
}: {
  data: LeadsOverTimePoint[] | null;
  error: string | null;
}) {
  if (error || data === null) return <ChartMessage tone="error">{error ?? "Could not load lead trends."}</ChartMessage>;

  if (data.every((point) => point.saved === 0 && point.contacted === 0)) {
    return <ChartMessage>No saved or contacted leads in this period.</ChartMessage>;
  }

  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#34394d" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={18}
            tick={{ fill: "#9aa1b5", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#4a5062" }}
          />
          <YAxis
            allowDecimals={false}
            width={34}
            tick={{ fill: "#9aa1b5", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            labelFormatter={(label) => String(label)}
            formatter={(value, name) => [value, name]}
            contentStyle={{
              backgroundColor: "#1b1e29",
              border: "1px solid #34394d",
              borderRadius: 8,
              color: "#e7e9f0",
              fontSize: 12,
            }}
            labelStyle={{ color: "#9aa1b5" }}
          />
          <Legend wrapperStyle={{ color: "#aeb4c5", fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="saved"
            name="Leads Saved"
            stroke="#8b7cff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="contacted"
            name="Leads Marked Contacted"
            stroke="#22c5c7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartMessage({
  children,
  tone = "empty",
}: {
  children: string;
  tone?: "empty" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex min-h-[180px] items-center justify-center rounded-xl border border-dashed px-4 text-center text-[12px] ${
        tone === "error"
          ? "border-red-500/30 bg-red-500/5 text-red-300"
          : "border-line bg-field text-muted"
      }`}
    >
      {children}
    </div>
  );
}
