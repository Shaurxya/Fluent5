"use client";

import { useState } from "react";
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface ChartData {
  date: string;
  activities: number;
  xp: number;
}

interface ProgressChartProps {
  data: ChartData[];
}

type ChartType = "line" | "bar";

export default function ProgressChart({ data }: ProgressChartProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [showXP, setShowXP] = useState(true);
  const [showActivities, setShowActivities] = useState(true);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { color: string; name: string; value: number }[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background-card border border-border rounded-xl p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-xs text-foreground-muted">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-background-card border border-border p-6">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setShowActivities(!showActivities)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              showActivities
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-background-secondary text-foreground-muted border border-border"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-accent" />
            Activities
          </button>
          <button
            onClick={() => setShowXP(!showXP)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              showXP
                ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                : "bg-background-secondary text-foreground-muted border border-border"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            XP
          </button>
        </div>
        <div className="flex gap-1 bg-background-secondary rounded-lg p-1">
          <button
            onClick={() => setChartType("bar")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all",
              chartType === "bar" ? "bg-background-card text-foreground" : "text-foreground-muted"
            )}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType("line")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all",
              chartType === "line" ? "bg-background-card text-foreground" : "text-foreground-muted"
            )}
          >
            Line
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--foreground-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--foreground-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {showActivities && (
                <Bar
                  dataKey="activities"
                  name="Activities"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              )}
              {showXP && (
                <Bar
                  dataKey="xp"
                  name="XP"
                  fill="#34d399"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              )}
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--foreground-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--foreground-subtle)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {showActivities && (
                <Line
                  type="monotone"
                  dataKey="activities"
                  name="Activities"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ fill: "var(--accent)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {showXP && (
                <Line
                  type="monotone"
                  dataKey="xp"
                  name="XP"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ fill: "#34d399", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
