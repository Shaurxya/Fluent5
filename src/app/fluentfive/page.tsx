import Link from "next/link";
import {
  Mic,
  BookOpen,
  PenTool,
  RotateCcw,
  MessageSquare,
  Flame,
  Trophy,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";

const activities = [
  {
    icon: Mic,
    title: "Shadowing",
    description: "Listen & repeat model sentences to nail your pronunciation and rhythm.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: MessageSquare,
    title: "Speak & Think Out Loud",
    description: "Respond to prompts for 2 minutes while your speech is transcribed live.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: BookOpen,
    title: "Active Reading + Chunks",
    description: "Read passages, collect useful phrases, and explore definitions instantly.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: PenTool,
    title: "Write & Rewrite",
    description: "Draft, check grammar with AI, then polish your writing to perfection.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: RotateCcw,
    title: "Spaced Repetition Review",
    description: "Review your saved chunks with smart flashcards that adapt to your memory.",
    color: "from-rose-500 to-pink-500",
  },
];

import Lightfall from "@/components/Lightfall";

// ... existing code ...

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <Lightfall
          colors={['#1e1b4b', '#312e81', '#4c1d95']}
          backgroundColor="#020617"
          speed={0.15}
          streakCount={3}
          streakWidth={1}
          streakLength={1}
          glow={0.3}
          density={0.4}
          twinkle={1}
          zoom={2}
          backgroundGlow={0.5}
          opacity={0.6}
          mouseInteraction={true}
          mouseStrength={0.5}
          mouseRadius={0.6}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold font-[family-name:var(--font-outfit)]">
            Fluent<span className="gradient-text">Five</span>
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl gradient-bg text-white font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="animate-fade-in-up bg-black/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 sm:p-16 max-w-4xl mx-auto shadow-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-foreground-muted mb-6">
            <Zap className="w-4 h-4 text-accent" />
            Science-backed fluency training
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-[family-name:var(--font-outfit)] leading-tight mb-6 text-white drop-shadow-md">
            Master English Fluency
            <br />
            <span className="gradient-text">in 5 Daily Activities</span>
          </h1>
          <p className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Think, speak, read, and write in English with confidence.
            FluentFive combines shadowing, active reading, spaced repetition,
            and AI feedback into a single daily practice.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl gradient-bg text-white font-semibold text-base hover:opacity-90 transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              Start Training Free <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-4 text-foreground-muted text-sm bg-black/30 px-5 py-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-warning" />
                Streak tracking
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-accent" />
                XP rewards
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-outfit)] mb-3">
            Your Daily Practice
          </h2>
          <p className="text-foreground-muted text-lg">
            Five activities, 15–30 minutes, every day.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {activities.map((activity) => (
            <div
              key={activity.title}
              className="group rounded-2xl bg-background-card border border-border p-6 card-hover cursor-default"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activity.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <activity.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold font-[family-name:var(--font-outfit)] mb-2">
                {activity.title}
              </h3>
              <p className="text-foreground-muted text-sm leading-relaxed">
                {activity.description}
              </p>
            </div>
          ))}

          {/* Stats card */}
          <div className="rounded-2xl glass border border-border/50 p-6 flex flex-col justify-center items-center text-center card-hover">
            <div className="text-4xl font-bold gradient-text font-[family-name:var(--font-outfit)] mb-2">
              100%
            </div>
            <div className="text-foreground-muted text-sm">
              Free • No credit card • Sync across devices
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-foreground-subtle text-sm">
          © {new Date().getFullYear()} FluentFive. Built for English learners everywhere.
        </div>
      </footer>
    </div>
  );
}
