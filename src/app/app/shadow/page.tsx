"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Mic,
  Play,
  Square,
  Volume2,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sentence } from "@/lib/supabase/types";

type Difficulty = "easy" | "med" | "hard";
const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "med", label: "Intermediate" },
  { key: "hard", label: "Advanced" },
];

export default function ShadowPage() {
  const supabase = createClient();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadSentence = useCallback(async () => {
    setLoading(true);
    setRecordingUrl(null);
    setCompleted(false);
    const { data } = await supabase
      .from("sentences")
      .select("*")
      .eq("level", difficulty);

    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)];
      setSentence(random as Sentence);
    }
    setLoading(false);
    
    // Clean up previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [difficulty, supabase]);

  useEffect(() => {
    loadSentence();
  }, [loadSentence]);

  async function playModel() {
    if (!sentence) return;
    
    // If we already fetched this audio, just play it again to save API calls
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      return;
    }

    try {
      setIsPlaying(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence.text })
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      // Speed up slightly based on difficulty, but keep it natural for TTS
      audio.playbackRate = difficulty === "hard" ? 1.1 : difficulty === "med" ? 1.0 : 0.9;
      
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      
      audioRef.current = audio;
      audio.play();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate high-quality voice. Check your API keys.');
      setIsPlaying(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function completeActivity() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !sentence) return;

    const today = new Date().toISOString().split("T")[0];

    await supabase.from("sessions").upsert(
      {
        user_id: user.id,
        activity_key: "shadow",
        done_on: today,
        payload: { sentence_id: sentence.id, difficulty },
      },
      { onConflict: "user_id,activity_key,done_on" }
    );

    // Award XP
    const { data: profileData } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", user.id)
      .single();
    if (profileData) {
      await supabase
        .from("profiles")
        .update({ xp: (profileData.xp || 0) + 20, last_active: today })
        .eq("id", user.id);
    }

    setCompleted(true);
    toast.success("Shadowing complete! +20 XP ✨");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
            Shadowing
          </h1>
        </div>
        <p className="text-foreground-muted">
          Listen to the model, record yourself, then compare.
        </p>
      </div>

      {/* Difficulty Selector */}
      <div className="flex gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => setDifficulty(d.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              difficulty === d.key
                ? "gradient-bg text-white"
                : "bg-background-card border border-border text-foreground-muted hover:text-foreground hover:border-border-hover"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Sentence Card */}
      <div className="rounded-2xl bg-background-card border border-border p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : sentence ? (
          <div className="space-y-6">
            <p className="text-xl leading-relaxed font-medium text-center">
              &ldquo;{sentence.text}&rdquo;
            </p>

            {/* Model Playback */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={playModel}
                disabled={isPlaying}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all",
                  isPlaying
                    ? "bg-accent/20 text-accent"
                    : "gradient-bg text-white hover:opacity-90"
                )}
              >
                {isPlaying ? (
                  <Volume2 className="w-5 h-5 animate-pulse" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {isPlaying ? "Playing..." : "Play Model"}
              </button>
              <button
                onClick={loadSentence}
                className="p-3 rounded-xl border border-border hover:border-border-hover hover:bg-background-card-hover transition-all"
                title="New sentence"
              >
                <RefreshCw className="w-5 h-5 text-foreground-muted" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-foreground-muted">
            <p>No sentences found. Run the seed script to add content.</p>
          </div>
        )}
      </div>

      {/* Recording Section */}
      <div className="rounded-2xl bg-background-card border border-border p-6 space-y-4">
        <h3 className="font-semibold font-[family-name:var(--font-outfit)]">
          Your Recording
        </h3>

        <div className="flex items-center justify-center gap-4">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-error text-white font-medium text-sm hover:opacity-90 transition-all"
            >
              <Square className="w-4 h-4" />
              Stop Recording
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="relative flex items-center gap-2 px-6 py-3 rounded-xl bg-error/10 text-error font-medium text-sm hover:bg-error/20 transition-all"
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-xl bg-error/20 animate-pulse-ring" />
              )}
              <Mic className="w-5 h-5" />
              Start Recording
            </button>
          )}
        </div>

        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-error text-sm">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
            Recording...
          </div>
        )}

        {recordingUrl && (
          <div className="space-y-3">
            <audio controls src={recordingUrl} className="w-full" />
            <div className="flex gap-3">
              <button
                onClick={playModel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:border-border-hover text-sm font-medium transition-all"
              >
                <Volume2 className="w-4 h-4" />
                Replay Model
              </button>
              <button
                onClick={startRecording}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:border-border-hover text-sm font-medium transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Re-record
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Complete Button */}
      {recordingUrl && !completed && (
        <button
          onClick={completeActivity}
          className="w-full py-4 rounded-2xl gradient-bg text-white font-semibold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Complete Shadowing (+20 XP)
        </button>
      )}

      {completed && (
        <div className="rounded-2xl bg-success/10 border border-success/20 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
          <h3 className="text-lg font-semibold font-[family-name:var(--font-outfit)] mb-1">
            Great job! 🎉
          </h3>
          <p className="text-foreground-muted text-sm">
            Shadowing complete for today. Come back tomorrow!
          </p>
        </div>
      )}
    </div>
  );
}
