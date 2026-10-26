"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestJSON } from "@/lib/nlp/client";
import { toast } from "sonner";
import { type Grade, GRADE_MAP } from "@/lib/sm2";
import {
  RotateCcw,
  CheckCircle2,
  Loader2,
  Inbox,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chunk } from "@/lib/supabase/types";

export default function ReviewPage() {
  const supabase = createClient();
  const [cards, setCards] = useState<Chunk[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loadError,setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [earned, setEarned] = useState(0);
  const reviewAttempt = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDue() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {setLoadError("Sign in again to load your flashcards.");setLoading(false);return;}

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("chunks")
        .select("*")
        .eq("user_id", user.id)
        .lte("due_date", today)
        .order("due_date", { ascending: true });

      if (error) setLoadError("Could not load due cards. Refresh to retry.");
      if (data) setCards(data as Chunk[]);
      setLoading(false);
    }
    loadDue();
  }, [supabase]);

  async function handleGrade(grade: Grade) {
    const card = cards[currentIndex];
    if (!card || saving) return;
    setSaving(true); reviewAttempt.current ||= crypto.randomUUID();
    try {
      const result = await requestJSON<{ xp_awarded: number }>("/api/learning/review", { method: "POST", body: JSON.stringify({ attempt_id: reviewAttempt.current, chunk_id: card.id, quality: GRADE_MAP[grade] }) });
      setEarned((n) => n + result.xp_awarded); setReviewed((n) => n+1); setFlipped(false); reviewAttempt.current = null;
      if (currentIndex+1 >= cards.length) { setCompleted(true); toast.success("Review saved."); }
      else setCurrentIndex((i) => i+1);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Review save failed. Try again."); }
    finally { setSaving(false); }
  }

  const currentCard = cards[currentIndex];

  if (loading) {
    return (
      <div className="max-w-xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (loadError) return <div role="alert" className="nlp-panel space-y-4"><p>{loadError}</p><button className="nlp-button" onClick={() => window.location.reload()}>Retry loading flashcards</button></div>;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
            Spaced Repetition Review
          </h1>
        </div>
        <p className="text-foreground-muted">
          Review your saved chunks with flashcards.
        </p>
      </div>

      {cards.length === 0 && !completed ? (
        /* Empty state */
        <div className="rounded-2xl bg-background-card border border-border p-12 text-center">
          <Inbox className="w-16 h-16 text-foreground-subtle mx-auto mb-4" />
          <h3 className="text-lg font-semibold font-[family-name:var(--font-outfit)] mb-2">
            No cards due today
          </h3>
          <p className="text-foreground-muted text-sm max-w-sm mx-auto">
            Save phrases while reading to build your deck. Cards will appear here when they&apos;re due for review.
          </p>
        </div>
      ) : completed ? (
        /* Completion */
        <div className="rounded-2xl bg-success/10 border border-success/20 p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-xl font-bold font-[family-name:var(--font-outfit)] mb-2">
            Review Complete! 🧠
          </h3>
          <p className="text-foreground-muted">
            You reviewed <span className="font-medium text-foreground">{reviewed}</span> cards and earned{" "}
            <span className="font-medium text-accent">{earned} XP</span>.
          </p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-foreground-muted">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span>{reviewed} reviewed</span>
          </div>
          <div className="w-full h-2 rounded-full bg-background-card overflow-hidden">
            <div
              className="h-full gradient-bg rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
            />
          </div>

          {/* Flashcard */}
          <div
            className="flip-card h-64 cursor-pointer"
            role="button" tabIndex={0} aria-label="Flip flashcard" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(!flipped); } }}
            onClick={() => setFlipped(!flipped)}
          >
            <div className={cn("flip-card-inner", flipped && "flipped")}>
              {/* Front */}
              <div className="flip-card-front rounded-2xl bg-background-card border border-border p-8 flex flex-col items-center justify-center">
                <p className="text-sm text-foreground-muted mb-4">
                  Do you remember this chunk?
                </p>
                <p className="text-xl font-medium text-center leading-relaxed">
                  &ldquo;{currentCard?.text}&rdquo;
                </p>
                <p className="text-sm text-accent mt-6 flex items-center gap-1">
                  Tap to reveal <ArrowRight className="w-3 h-3" />
                </p>
              </div>

              {/* Back */}
              <div className="flip-card-back rounded-2xl bg-gradient-to-br from-accent-start/10 to-accent-end/10 border border-accent/20 p-8 flex flex-col items-center justify-center">
                <p className="text-sm text-foreground-muted mb-4">
                  Your saved chunk:
                </p>
                <p className="text-xl font-medium text-center leading-relaxed">
                  &ldquo;{currentCard?.text}&rdquo;
                </p>
                {currentCard?.note && (
                  <p className="text-sm text-foreground-muted mt-3 italic">
                    {currentCard.note}
                  </p>
                )}
                <p className="text-sm text-foreground-muted mt-4">
                  How well did you remember?
                </p>
              </div>
            </div>
          </div>

          {/* Grade Buttons */}
          {flipped && (
            <div className="grid grid-cols-4 gap-3 animate-fade-in">
              <button
                disabled={saving}
                onClick={() => handleGrade("again")}
                className="py-3 rounded-xl bg-error/10 text-error font-medium text-sm hover:bg-error/20 transition-all"
              >
                Again
              </button>
              <button
                disabled={saving}
                onClick={() => handleGrade("hard")}
                className="py-3 rounded-xl bg-warning/10 text-warning font-medium text-sm hover:bg-warning/20 transition-all"
              >
                Hard
              </button>
              <button
                disabled={saving}
                onClick={() => handleGrade("good")}
                className="py-3 rounded-xl bg-info/10 text-info font-medium text-sm hover:bg-info/20 transition-all"
              >
                Good
              </button>
              <button
                disabled={saving}
                onClick={() => handleGrade("easy")}
                className="py-3 rounded-xl bg-success/10 text-success font-medium text-sm hover:bg-success/20 transition-all"
              >
                Easy
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
