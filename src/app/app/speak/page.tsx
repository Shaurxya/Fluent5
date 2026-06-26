"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Clock,
  Type,
} from "lucide-react";

const PROMPTS = [
  "Describe your ideal day from morning to night.",
  "Talk about a skill you want to learn and why.",
  "Explain a recent challenge you faced and how you solved it.",
  "Describe a place you've visited that left a strong impression.",
  "Talk about a book, movie, or show that changed your perspective.",
  "Explain the pros and cons of working from home.",
  "Describe your morning routine and why it works for you.",
  "Talk about someone who has influenced you and how.",
  "Explain a topic you're passionate about to someone who knows nothing.",
  "Describe what technology will look like in 10 years.",
  "Talk about a mistake that taught you something valuable.",
  "Describe the perfect weekend with unlimited resources.",
  "Explain the benefits of learning a second language.",
  "Talk about a goal you're working toward right now.",
  "Describe your favorite meal and the memories attached to it.",
];

export default function SpeakPage() {
  const supabase = createClient();
  const [prompt, setPrompt] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, []);

  const stopSession = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && isRunning) {
      stopSession();
    }
  }, [timeLeft, isRunning, stopSession]);

  function startSession() {
    setTranscript("");
    setWordCount(0);
    setTimeLeft(120);
    setIsRunning(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Start speech recognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim += t;
        }
      }
      const full = finalTranscript + interim;
      setTranscript(full);
      setWordCount(full.trim().split(/\s+/).filter(Boolean).length);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        toast.error(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Restart if still running (browser stops after silence)
      if (timerRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  async function completeActivity() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    await supabase.from("sessions").upsert(
      {
        user_id: user.id,
        activity_key: "speak",
        done_on: today,
        payload: { prompt, transcript, word_count: wordCount },
      },
      { onConflict: "user_id,activity_key,done_on" }
    );

    await supabase.from("profiles").select("xp").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        supabase.from("profiles").update({ xp: (data.xp || 0) + 25, last_active: today }).eq("id", user.id);
      }
    });

    setCompleted(true);
    setLoading(false);
    toast.success("Speaking complete! +25 XP ✨");
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((120 - timeLeft) / 120) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
            Speak & Think Out Loud
          </h1>
        </div>
        <p className="text-foreground-muted">
          Respond to the prompt for 2 minutes. Your speech will be transcribed live.
        </p>
      </div>

      {/* Prompt Card */}
      <div className="rounded-2xl bg-background-card border border-border p-8 text-center">
        <p className="text-sm text-foreground-muted mb-3 uppercase tracking-wider">
          Your Prompt
        </p>
        <p className="text-xl font-medium leading-relaxed mb-4">
          &ldquo;{prompt}&rdquo;
        </p>
        <button
          onClick={() =>
            setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
          }
          className="text-sm text-accent hover:underline flex items-center gap-1 mx-auto"
          disabled={isRunning}
        >
          <RefreshCw className="w-3 h-3" /> New prompt
        </button>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--border)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="url(#timer-gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-start)" />
                  <stop offset="100%" stopColor="var(--accent-end)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold font-[family-name:var(--font-outfit)]">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-foreground-muted text-sm">
            <Type className="w-4 h-4" />
            <span className="font-medium text-foreground text-lg">{wordCount}</span> words
          </div>
          <div className="flex items-center gap-2 text-foreground-muted text-sm">
            <Clock className="w-4 h-4" />
            {isRunning ? "Speaking..." : timeLeft === 120 ? "Ready" : "Done"}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        {!isRunning && !completed && timeLeft === 120 && (
          <button
            onClick={startSession}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 transition-all"
          >
            <Play className="w-5 h-5" />
            Start Speaking
          </button>
        )}
        {isRunning && (
          <button
            onClick={stopSession}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-error text-white font-semibold hover:opacity-90 transition-all"
          >
            <Square className="w-5 h-5" />
            Stop Early
          </button>
        )}
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="rounded-2xl bg-background-card border border-border p-6">
          <h3 className="font-semibold font-[family-name:var(--font-outfit)] mb-3">
            Your Transcript
          </h3>
          <p className="text-foreground-muted leading-relaxed whitespace-pre-wrap">
            {transcript}
          </p>
        </div>
      )}

      {/* Complete */}
      {!isRunning && transcript && !completed && (
        <button
          onClick={completeActivity}
          disabled={loading}
          className="w-full py-4 rounded-2xl gradient-bg text-white font-semibold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          Complete Speaking (+25 XP)
        </button>
      )}

      {completed && (
        <div className="rounded-2xl bg-success/10 border border-success/20 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
          <h3 className="text-lg font-semibold font-[family-name:var(--font-outfit)] mb-1">
            Well spoken! 🎤
          </h3>
          <p className="text-foreground-muted text-sm">
            You spoke {wordCount} words in {Math.round((120 - timeLeft))} seconds.
          </p>
        </div>
      )}
    </div>
  );
}
