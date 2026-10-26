"use client";

import Link from "next/link";
import { useState } from "react";
import { useLearningSummary, PersonalizedLearningPlan, SummaryError } from "@/components/nlp/LearningSummary";
import {
  Mic,
  MessageSquare,
  BookOpen,
  PenTool,
  RotateCcw,
  Sparkles,
  Flame,
  Search,
  ArrowRight,
  Check
} from "lucide-react";

interface ActivityProps {
  type: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  href: string;
  isDone?: boolean;
}

const activities: ActivityProps[] = [
  {
    type: "INPUT",
    title: "Read + Chunks",
    description: "Read a short paragraph and extract useful target phrases.",
    category: "Comprehension",
    icon: BookOpen,
    href: "/app/cycle",
  },
  {
    type: "OUTPUT",
    title: "Speak & Think",
    description: "Plan your response and speak using the targeted phrases.",
    category: "Fluency",
    icon: MessageSquare,
    href: "/app/cycle",
  },
  {
    type: "INPUT",
    title: "Shadowing",
    description: "Listen to native audio and repeat to improve pronunciation.",
    category: "Pronunciation",
    icon: Mic,
    href: "/app/shadow",
  },
  {
    type: "OUTPUT",
    title: "Write & Rewrite",
    description: "Draft a paragraph and get AI corrections for natural flow.",
    category: "Written Expression",
    icon: PenTool,
    href: "/app/write",
  },
  {
    type: "REVIEW",
    title: "Spaced Review",
    description: "Review missed target phrases from previous sessions.",
    category: "Retention",
    icon: RotateCcw,
    href: "/app/review",
  },
];

function ActivityCard({ activity }: { activity: ActivityProps }) {
  return (
    <div className="group relative bg-surface border border-border rounded-2xl p-6 transition-all duration-300 hover:bg-surface-raised hover:border-border-subtle flex flex-col h-full">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-raised flex items-center justify-center border border-border-subtle">
            <activity.icon className="w-5 h-5 text-accent" />
          </div>
          <span className="text-xs font-bold tracking-[0.1em] text-text-muted uppercase">
            {activity.type}
          </span>
        </div>

      </div>

      {/* Title & Body */}
      <div className="flex-1 mb-8">
        <h3 className="text-lg font-bold text-text-primary mb-2 leading-tight">
          {activity.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          {activity.description}
        </p>
      </div>

      {/* Footer Row */}
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-subtle">
        <span className="text-xs font-medium text-text-muted">
          {activity.category}
        </span>
        <Link
          href={activity.href}
          className="flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {activity.isDone ? (
            <>
              DONE <Check className="w-4 h-4" />
            </>
          ) : (
            <>
              START <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

export default function TodayPage() {
  const {data,error,reload} = useLearningSummary();
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState("all");
  const [sort,setSort] = useState("daily");
  const visible = activities.filter((a) => (filter === "all" || a.type === filter) && `${a.title} ${a.description}`.toLowerCase().includes(search.toLowerCase()));
  if (sort === "name") visible.sort((a,b) => a.title.localeCompare(b.title));
  const activityKeys: Record<string,string> = { "Read + Chunks": "read", "Speak & Think": "speak", "Shadowing": "shadow", "Write & Rewrite": "write", "Spaced Review": "review" };
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-text-primary tracking-tight mb-2">
            Today
          </h1>
          <p className="text-text-secondary">
            Your five daily activities, one loop to fluency.
          </p>
        </div>
        <div className="text-sm font-bold tracking-widest text-accent uppercase">
          STARTER
        </div>
      </div>

      {error && <SummaryError error={error} retry={reload} />}
      {/* Banner */}
      <div className="bg-surface border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-warning" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {data ? `${data.profile.streak}-day streak, ${data.today_activities.length} of 5 done` : "Loading your practice history…"}
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              {data ? `${data.weekly_active_days} active days this week · ${data.due_chunks} phrases due for review` : "Your real progress appears after history loads."}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-center w-10 h-10 text-accent opacity-50">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-[40%]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            aria-label="Search activities" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="w-full bg-surface border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-ring transition-colors"
          />
        </div>
        
        {/* Filters & Sort */}
        <div className="flex items-center gap-3">
          <select aria-label="Filter activities" value={filter} onChange={(e) => setFilter(e.target.value)} className="nlp-input w-auto"><option value="all">All activities</option><option value="INPUT">Input</option><option value="OUTPUT">Output</option><option value="REVIEW">Review</option></select>
          <select aria-label="Sort activities" value={sort} onChange={(e) => setSort(e.target.value)} className="nlp-input w-auto"><option value="daily">Daily order</option><option value="name">Name</option></select>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visible.map((activity, idx) => (
          <ActivityCard key={idx} activity={{...activity, isDone: data?.today_activities.includes(activityKeys[activity.title])}} />
        ))}
      </div>
      {data && <PersonalizedLearningPlan data={data} />}
    </div>
  );
}
