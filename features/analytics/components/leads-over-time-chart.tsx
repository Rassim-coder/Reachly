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

import type { AnalyticsChartPoint } from "../analytics";

type LeadsOverTimeChartProps = {
  data: AnalyticsChartPoint[];
};

/**
 * Reusable Recharts wrapper for the Analytics page.
 *
 * The data itself is fetched and bucketed on the server. `Contacted-over-time`
 * is intentionally omitted because the app does not record reliable contact
 * events yet.
 */
export function LeadsOverTimeChart({ data }: LeadsOverTimeChartProps) {
  if (data.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-field p-3 text-[12px] text-muted">
        No saved leads fall inside the selected date range.
      </p>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 24, left: 6 }}>
          <CartesianGrid stroke="#3b4263" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#9aa1b5", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#9aa1b5", fontSize: 12 }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#232736",
              border: "1px solid #3b4263",
              color: "#e5e7ef",
              fontSize: 12,
              borderRadius: 8,
            }}
            labelStyle={{ color: "#9aa1b5" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="saved"
            name="Saved"
            stroke="#7c4dff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
