"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestJSON } from "@/lib/nlp/client";
import { toast } from "sonner";
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateChunkQuestions } from "@/lib/chunk-quiz";
import type { QuizQuestion, Chunk } from "@/lib/supabase/types";

type TestMode = "grammar" | "chunks" | "mixed";
type QuestionItem = { prompt: string; options: string[]; answer_index: number };

export default function TestPage() {
  const supabase = createClient();
  const attempt = useRef<string | null>(null);
  const [mode, setMode] = useState<TestMode | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  const startTest = useCallback(async (selectedMode: TestMode) => {
    attempt.current = crypto.randomUUID();
    setLoading(true);
    setMode(selectedMode);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setFinished(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let allQuestions: QuestionItem[] = [];

    if (selectedMode === "grammar" || selectedMode === "mixed") {
      const { data } = await supabase.from("quiz_questions").select("*");
      if (data) {
        const shuffled = (data as QuizQuestion[]).sort(() => Math.random() - 0.5);
        allQuestions = shuffled.slice(0, selectedMode === "grammar" ? 10 : 5).map((q) => ({
          prompt: q.prompt,
          options: q.options as string[],
          answer_index: q.answer_index,
        }));
      }
    }

    if (selectedMode === "chunks" || selectedMode === "mixed") {
      const { data } = await supabase
        .from("chunks")
        .select("*")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        const chunkQs = generateChunkQuestions(
          data as Chunk[],
          selectedMode === "chunks" ? 10 : 5
        );
        allQuestions = [...allQuestions, ...chunkQs];
      } else if (selectedMode === "chunks") {
        toast.error("You need saved chunks to take this quiz. Try Active Reading first!");
        setMode(null);
        setLoading(false);
        return;
      }
    }

    if (allQuestions.length === 0) {
      toast.error("No questions available. Make sure to run the seed script.");
      setMode(null);
      setLoading(false);
      return;
    }

    // Shuffle
    setQuestions(allQuestions.sort(() => Math.random() - 0.5));
    setLoading(false);
  }, [supabase]);

  function selectAnswer(index: number) {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    const correct = questions[currentIndex].answer_index === index;
    if (correct) setScore((prev) => prev + 1);
  }

  function nextQuestion() {
    if (currentIndex + 1 >= questions.length) {
      finishTest();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  }

  async function finishTest() {
    if (!attempt.current || !mode) return;
    setLoading(true);
    try {
      const result = await requestJSON<{xp_awarded:number}>("/api/learning/test", {method:"POST",body:JSON.stringify({attempt_id:attempt.current,mode,score,total:questions.length})});
      setFinished(true); toast.success(`Test saved. +${result.xp_awarded} XP`);
    } catch(e) {toast.error(e instanceof Error ? e.message : "Quiz save failed. Retry finishing this question.");}
    finally {setLoading(false);}
  }

  const currentQ = questions[currentIndex];

  // Mode selection screen
  if (!mode) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-start to-accent-end flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
              Test Your Skills
            </h1>
          </div>
          <p className="text-foreground-muted">
            Choose a quiz mode to test your English knowledge.
          </p>
        </div>

        <div className="grid gap-4 stagger">
          {[
            { key: "grammar" as TestMode, title: "Grammar & Usage", desc: "Test your knowledge of English grammar rules and common usage patterns.", color: "from-violet-500 to-purple-600" },
            { key: "chunks" as TestMode, title: "My Chunks", desc: "Fill-in-the-gap questions auto-generated from your saved chunks.", color: "from-emerald-500 to-teal-500" },
            { key: "mixed" as TestMode, title: "Mixed", desc: "A mix of grammar questions and chunk-based questions.", color: "from-amber-500 to-orange-500" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => startTest(m.key)}
              className="flex items-center gap-4 p-6 rounded-2xl bg-background-card border border-border text-left card-hover group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold font-[family-name:var(--font-outfit)] mb-1">{m.title}</h3>
                <p className="text-sm text-foreground-muted">{m.desc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-foreground-subtle group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Results screen
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const xpEarned = Math.round((pct / 100) * 50);
    return (
      <div className="max-w-xl mx-auto space-y-8">
        <div className="rounded-2xl bg-background-card border border-border p-10 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${pct >= 70 ? "bg-success/10" : pct >= 40 ? "bg-warning/10" : "bg-error/10"}`}>
            <Trophy className={`w-10 h-10 ${pct >= 70 ? "text-success" : pct >= 40 ? "text-warning" : "text-error"}`} />
          </div>
          <h2 className="text-3xl font-bold font-[family-name:var(--font-outfit)] mb-2">
            {pct}%
          </h2>
          <p className="text-foreground-muted mb-6">
            You got {score} out of {questions.length} correct
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent font-medium text-sm mb-8">
            <Zap className="w-4 h-4" />+{xpEarned} XP earned
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setMode(null); setFinished(false); }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:border-border-hover text-sm font-medium transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              New Test
            </button>
            <button
              onClick={() => startTest(mode!)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Retake
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-foreground-muted">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span>Score: {score}/{currentIndex + (showResult ? 1 : 0)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-background-card overflow-hidden">
        <div
          className="h-full gradient-bg rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-2xl bg-background-card border border-border p-8">
        <p className="text-lg font-medium leading-relaxed mb-6">
          {currentQ?.prompt}
        </p>

        <div className="space-y-3">
          {currentQ?.options.map((option, i) => {
            const isCorrect = i === currentQ.answer_index;
            const isSelected = i === selectedAnswer;
            return (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                disabled={showResult}
                className={cn(
                  "w-full text-left px-5 py-4 rounded-xl border transition-all text-sm font-medium",
                  showResult && isCorrect
                    ? "bg-success/10 border-success/30 text-success"
                    : showResult && isSelected && !isCorrect
                    ? "bg-error/10 border-error/30 text-error"
                    : "bg-background-secondary border-border hover:border-border-hover hover:bg-background-card-hover"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-background-card flex items-center justify-center text-xs font-bold border border-border">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-success" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-error" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Next button */}
      {showResult && (
        <button
          onClick={nextQuestion}
          className="w-full py-3.5 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 animate-fade-in"
        >
          {currentIndex + 1 >= questions.length ? "See Results" : "Next Question"}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
