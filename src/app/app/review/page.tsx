"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { sm2, type Grade, GRADE_MAP } from "@/lib/sm2";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDue() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("chunks")
        .select("*")
        .eq("user_id", user.id)
        .lte("due_date", today)
        .order("due_date", { ascending: true });

      if (data) setCards(data as Chunk[]);
      setLoading(false);
    }
    loadDue();
  }, []);

  async function handleGrade(grade: Grade) {
    const card = cards[currentIndex];
    if (!card) return;

    const quality = GRADE_MAP[grade];
    const result = sm2({
      quality,
      ef: Number(card.ef),
      interval: card.interval,
      reps: card.reps,
    });

    // Update card in Supabase
    await supabase
      .from("chunks")
      .update({
        ef: result.ef,
        interval: result.interval,
        reps: result.reps,
        due_date: result.dueDate.toISOString().split("T")[0],
      })
      .eq("id", card.id);

    setReviewed((prev) => prev + 1);
    setFlipped(false);

    if (currentIndex + 1 >= cards.length) {
      // All done
      await completeSession();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  async function completeSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const xpEarned = reviewed * 10;

    await supabase.from("sessions").upsert(
      {
        user_id: user.id,
        activity_key: "review",
        done_on: today,
        payload: { cards_reviewed: reviewed + 1, xp_earned: xpEarned + 10 },
      },
      { onConflict: "user_id,activity_key,done_on" }
    );

    await supabase.from("profiles").select("xp").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        supabase.from("profiles").update({ xp: (data.xp || 0) + xpEarned + 10, last_active: today }).eq("id", user.id);
      }
    });

    setCompleted(true);
    toast.success(`Review complete! +${xpEarned + 10} XP ✨`);
  }

  const currentCard = cards[currentIndex];

  if (loading) {
    return (
      <div className="max-w-xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

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
            <span className="font-medium text-accent">{reviewed * 10} XP</span>.
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
                onClick={() => handleGrade("again")}
                className="py-3 rounded-xl bg-error/10 text-error font-medium text-sm hover:bg-error/20 transition-all"
              >
                Again
              </button>
              <button
                onClick={() => handleGrade("hard")}
                className="py-3 rounded-xl bg-warning/10 text-warning font-medium text-sm hover:bg-warning/20 transition-all"
              >
                Hard
              </button>
              <button
                onClick={() => handleGrade("good")}
                className="py-3 rounded-xl bg-info/10 text-info font-medium text-sm hover:bg-info/20 transition-all"
              >
                Good
              </button>
              <button
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
