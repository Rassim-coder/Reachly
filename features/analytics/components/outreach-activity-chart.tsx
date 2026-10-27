"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartMessage } from "./leads-over-time-chart";
import type { OutreachActivityPoint } from "../analytics";

export function OutreachActivityChart({
  data,
  error,
}: {
  data: OutreachActivityPoint[] | null;
  error: string | null;
}) {
  if (error || data === null) {
    return <ChartMessage tone="error">{error ?? "Could not load outreach activity."}</ChartMessage>;
  }

  if (data.every((point) => point.total === 0)) {
    return <ChartMessage>No recorded outreach activity in this date range.</ChartMessage>;
  }

  const totals = new Map(data.map((point) => [point.label, point.total]));

  return (
    <div className="h-[280px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#34394d" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={14}
            tick={{ fill: "#9aa1b5", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#4a5062" }}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            tick={{ fill: "#9aa1b5", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            labelFormatter={(label) =>
              `${String(label)} · Total ${totals.get(String(label)) ?? 0}`
            }
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
          <Legend wrapperStyle={{ color: "#aeb4c5", fontSize: 11 }} />
          <Bar
            dataKey="contacted"
            name="Marked Contacted"
            stackId="outreach"
            fill="#22c5c7"
          />
          <Bar
            dataKey="interested"
            name="Marked Interested"
            stackId="outreach"
            fill="#8b7cff"
          />
          <Bar
            dataKey="followUpsCompleted"
            name="Follow-ups Completed"
            stackId="outreach"
            fill="#34d399"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
