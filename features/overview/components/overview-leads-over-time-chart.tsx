"use client";

import { useState } from "react";
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

import type { OverviewMonthlyPoint } from "../overview";

type Series = "saved" | "contacted";

export function OverviewLeadsOverTimeChart({
  data,
  contactedError,
}: {
  data: OverviewMonthlyPoint[];
  contactedError: string | null;
}) {
  const [series, setSeries] = useState<Series>("saved");
  const hasSeriesValues = data.some((point) => point[series] > 0);

  return (
    <div>
      <div
        role="group"
        aria-label="Leads Over Time series"
        className="mb-3 inline-flex rounded-lg border border-line bg-field p-0.5"
      >
        {(["saved", "contacted"] as const).map((value) => {
          const active = series === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setSeries(value)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {value === "saved" ? "Saved" : "Contacted"}
            </button>
          );
        })}
      </div>

      {series === "contacted" && contactedError ? (
        <ChartMessage tone="error">{contactedError}</ChartMessage>
      ) : !hasSeriesValues ? (
        <ChartMessage>
          {series === "saved"
            ? "No leads were saved in the last 6 months."
            : "No leads were marked Contacted in the last 6 months."}
        </ChartMessage>
      ) : (
        <div className="h-[270px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#34394d" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
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
                formatter={(value) => [value, series === "saved" ? "Leads Saved" : "Marked Contacted"]}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  backgroundColor: "#1b1e29",
                  border: "1px solid #34394d",
                  borderRadius: 8,
                  color: "#e7e9f0",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#9aa1b5" }}
              />
              <Legend wrapperStyle={{ color: "#aeb4c5", fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey={series}
                name={series === "saved" ? "Leads Saved" : "Marked Contacted"}
                stroke={series === "saved" ? "#8b7cff" : "#22c5c7"}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
                isAnimationActive="auto"
                animationDuration={450}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {series === "contacted" && !contactedError ? (
        <p className="mt-2 text-[10px] text-faint">
          Counts leads marked Contacted in recorded status history; external outreach delivery is not tracked.
        </p>
      ) : null}
    </div>
  );
}

function ChartMessage({
  children,
  tone = "empty",
}: {
  children: string;
  tone?: "empty" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex min-h-[200px] items-center justify-center rounded-xl border border-dashed px-4 text-center text-[12px] ${
        tone === "error"
          ? "border-red-500/30 bg-red-500/5 text-red-300"
          : "border-line bg-field text-muted"
      }`}
    >
      {children}
    </div>
  );
}
