"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import {
  BarChart3,
  Calendar,
  Flame,
  Zap,
  Trophy,
  Target,
  Loader2,
  Mic,
  MessageSquare,
  BookOpen,
  PenTool,
  RotateCcw,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Session, Profile } from "@/lib/supabase/types";

// Dynamic import to avoid SSR hydration issues
const ProgressChart = dynamic(() => import("@/components/progress/ProgressChart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 rounded-2xl bg-background-card border border-border flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-accent" />
    </div>
  ),
});

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shadow: Mic,
  speak: MessageSquare,
  read: BookOpen,
  write: PenTool,
  review: RotateCcw,
};

const ACTIVITY_LABELS: Record<string, string> = {
  shadow: "Shadowing",
  speak: "Speak & Think",
  read: "Active Reading",
  write: "Write & Rewrite",
  review: "Review",
};

type TimeRange = 14 | 30 | 90;

export default function ProgressPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [loading, setLoading] = useState(true);
  const [daysActive, setDaysActive] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = subDays(new Date(), timeRange).toISOString().split("T")[0];

      const [profileRes, sessionsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .gte("done_on", startDate)
          .order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (sessionsRes.data) {
        setSessions(sessionsRes.data as Session[]);
        const uniqueDays = new Set(sessionsRes.data.map((s: Session) => s.done_on));
        setDaysActive(uniqueDays.size);
      }
      setLoading(false);
    }
    load();
  }, [timeRange]);

  // Aggregate chart data
  const chartData = useMemo(() => {
    const data: { date: string; activities: number; xp: number }[] = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const daySessions = sessions.filter((s) => s.done_on === dateStr);
      data.push({
        date: format(date, "MMM d"),
        activities: daySessions.length,
        xp: daySessions.length * 20, // Approximate
      });
    }
    return data;
  }, [sessions, timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-shimmer" />
          ))}
        </div>
        <div className="h-80 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-start to-accent-end flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
            Progress
          </h1>
        </div>
        <p className="text-foreground-muted">
          Track your fluency journey over time.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard icon={Calendar} label="Days Active" value={daysActive.toString()} iconColor="text-info" iconBg="bg-info/10" />
        <StatCard icon={Zap} label="Total XP" value={profile?.xp?.toLocaleString() || "0"} iconColor="text-accent" iconBg="bg-accent/10" />
        <StatCard icon={Flame} label="Current Streak" value={`${profile?.streak || 0} days`} iconColor="text-warning" iconBg="bg-warning/10" />
        <StatCard icon={Trophy} label="Best Streak" value={`${profile?.longest_streak || 0} days`} iconColor="text-success" iconBg="bg-success/10" />
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-outfit)]">
          Activity Chart
        </h2>
        <div className="flex gap-1 bg-background-card rounded-xl p-1 border border-border">
          {([14, 30, 90] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                timeRange === range
                  ? "gradient-bg text-white"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ProgressChart data={chartData} />

      {/* Activity Log */}
      <div>
        <h2 className="text-lg font-semibold font-[family-name:var(--font-outfit)] mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Recent Activity
        </h2>
        {sessions.length === 0 ? (
          <div className="rounded-2xl bg-background-card border border-border p-8 text-center text-foreground-muted">
            No activity recorded yet. Complete your first activity to start tracking!
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.slice(0, 50).map((session) => {
              const Icon = ACTIVITY_ICONS[session.activity_key] || Target;
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background-card border border-border"
                >
                  <Icon className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">
                      {ACTIVITY_LABELS[session.activity_key] || session.activity_key}
                    </span>
                  </div>
                  <span className="text-xs text-foreground-muted">
                    {format(parseISO(session.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="rounded-2xl bg-background-card border border-border p-5 card-hover">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold font-[family-name:var(--font-outfit)]">{value}</div>
      <div className="text-sm text-foreground-muted">{label}</div>
    </div>
  );
}
