"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { ChartMessage } from "./leads-over-time-chart";
import type { StatusDistributionPoint } from "../analytics";

function StatusLegend({ items }: { items: StatusDistributionPoint[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-2 px-2 pt-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.status} className="flex min-w-0 items-center gap-2 text-[11px]">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
          <span className="shrink-0 font-medium text-foreground">
            {item.count} <span className="text-faint">({item.percentage}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LeadStatusDistributionChart({
  data,
  total,
  error,
}: {
  data: StatusDistributionPoint[] | null;
  total: number | null;
  error: string | null;
}) {
  if (error || data === null || total === null) {
    return <ChartMessage tone="error">{error ?? "Could not load lead statuses."}</ChartMessage>;
  }

  if (total === 0) {
    return (
      <div className="space-y-3">
        <ChartMessage>No saved leads to distribute by status.</ChartMessage>
        <StatusLegend items={data} />
      </div>
    );
  }

  return (
    <div className="relative h-[320px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={58}
            outerRadius={86}
            cx="50%"
            cy="43%"
            paddingAngle={1}
            stroke="#171923"
            strokeWidth={2}
          >
            {data.map((item) => (
              <Cell key={item.status} fill={item.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, entry) => {
              const item = entry.payload as StatusDistributionPoint;
              return [`${value} (${item.percentage}%)`, item.label];
            }}
            contentStyle={{
              backgroundColor: "#1b1e29",
              border: "1px solid #34394d",
              borderRadius: 8,
              color: "#e7e9f0",
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="bottom"
            content={<StatusLegend items={data} />}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute left-1/2 top-[43%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <span className="text-[10px] text-faint">Total leads</span>
        <span className="text-[22px] font-semibold text-foreground">{total}</span>
      </div>
    </div>
  );
}
