"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartMessage } from "./leads-over-time-chart";
import type { LeadsByNichePoint } from "../analytics";

function wrapLabel(label: string, maxCharacters = 22): string[] {
  const words = label
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      if (word.length <= maxCharacters) return [word];
      const chunks: string[] = [];
      for (let index = 0; index < word.length; index += maxCharacters) {
        chunks.push(word.slice(index, index + maxCharacters));
      }
      return chunks;
    });
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxCharacters) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [label];
}

function NicheTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const label = payload?.value ?? "";
  const lines = wrapLabel(label);
  const firstDy = -((lines.length - 1) * 6);

  return (
    <text
      x={x - 8}
      y={y}
      textAnchor="end"
      dominantBaseline="middle"
      fill="#aeb4c5"
      fontSize={10}
    >
      <title>{label}</title>
      {lines.map((line, index) => (
        <tspan key={`${label}:${index}`} x={x - 8} dy={index === 0 ? firstDy : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function LeadsByNicheChart({
  data,
  error,
}: {
  data: LeadsByNichePoint[] | null;
  error: string | null;
}) {
  if (error || data === null) {
    return <ChartMessage tone="error">{error ?? "Could not load niche counts."}</ChartMessage>;
  }

  if (data.length === 0) return <ChartMessage>No saved leads to group by niche.</ChartMessage>;

  const chartHeight = Math.max(
    260,
    data.reduce((height, item) => height + Math.max(34, wrapLabel(item.label).length * 14), 0) + 28,
  );

  return (
    <div className="w-full min-w-0" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 2 }}
        >
          <CartesianGrid horizontal={false} stroke="#34394d" strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "#9aa1b5", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#4a5062" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={174}
            interval={0}
            tick={<NicheTick />}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [value, "Saved leads"]}
            labelFormatter={(_, payload) =>
              String(payload[0]?.payload?.label ?? "Niche")
            }
            contentStyle={{
              backgroundColor: "#1b1e29",
              border: "1px solid #34394d",
              borderRadius: 8,
              color: "#e7e9f0",
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Saved leads" fill="#8b7cff" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
