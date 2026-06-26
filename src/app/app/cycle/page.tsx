"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Mic, ArrowRight, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

// Configuration Constants
const PREP_SECONDS = 45;
const SPEAK_SECONDS = 90;
const TARGET_CHUNK_COUNT = 5;
const MIN_CHUNKS_TO_USE = 3;

type CycleState = "read" | "think" | "speak" | "feedback" | "done";

export default function FluencyCyclePage() {
  const [currentState, setCurrentState] = useState<CycleState>("read");

  // Shared state that carries through the phases
  const [paragraph, setParagraph] = useState<string | null>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [spokenSeconds, setSpokenSeconds] = useState<number>(0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header showing progress */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
              Fluency Cycle
            </h1>
            <p className="text-sm text-[#E4E4E7]">Read → Think → Speak</p>
          </div>
        </div>

        {/* Simple Progress Bar */}
        <div className="flex gap-2">
          {["read", "think", "speak", "feedback"].map((step) => (
            <div
              key={step}
              className={cn(
                "h-2 w-12 rounded-full transition-all duration-500",
                currentState === step
                  ? "bg-accent"
                  : ["read", "think", "speak", "feedback"].indexOf(currentState) > ["read", "think", "speak", "feedback"].indexOf(step)
                  ? "bg-accent/40"
                  : "bg-white/20"
              )}
            />
          ))}
        </div>
      </div>

      {/* State Machine Renderer */}
      <div className="min-h-[60vh]">
        {currentState === "read" && (
          <ReadPhase 
            onComplete={() => setCurrentState("think")} 
            paragraph={paragraph}
            setParagraph={setParagraph}
            targets={targets}
            setTargets={setTargets}
          />
        )}
        {currentState === "think" && (
          <ThinkPhase 
            onComplete={() => setCurrentState("speak")} 
            targets={targets}
            setPrompt={setPrompt}
            prompt={prompt}
            paragraph={paragraph}
          />
        )}
        {currentState === "speak" && (
          <SpeakPhase 
            onComplete={() => setCurrentState("feedback")} 
            targets={targets}
            setTranscript={setTranscript}
            setSpokenSeconds={setSpokenSeconds}
          />
        )}
        {currentState === "feedback" && (
          <FeedbackPhase 
            onComplete={() => setCurrentState("done")} 
            paragraph={paragraph}
            targets={targets}
            prompt={prompt}
            transcript={transcript}
            spokenSeconds={spokenSeconds}
          />
        )}
        {currentState === "done" && (
          <DonePhase />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Phase 1: READ
// ----------------------------------------------------------------------
function ReadPhase({ 
  onComplete, 
  paragraph, 
  setParagraph, 
  targets, 
  setTargets 
}: { 
  onComplete: () => void, 
  paragraph: string | null, 
  setParagraph: (p: string) => void, 
  targets: any[], 
  setTargets: (t: any[]) => void 
}) {
  const [loading, setLoading] = useState(!paragraph);
  const [viewedTargets, setViewedTargets] = useState<Set<number>>(new Set());
  const [activeTarget, setActiveTarget] = useState<number | null>(null);

  // Use a ref to ensure we only load once
  const hasLoaded = React.useRef(false);

  React.useEffect(() => {
    if (paragraph || hasLoaded.current) return;
    hasLoaded.current = true;
    
    async function loadContent() {
      try {
        // Fetch a random safe wikipedia summary
        const SAFE_TOPICS = [
          "Coffee", "Bicycle", "Architecture", "Photography", "Gardening", 
          "Running", "Cooking", "Origami", "Bread", "Tea", 
          "Painting", "Hiking", "Surfing", "Baking", "Pottery", 
          "Astronomy", "Chess", "Yoga", "Music", "Dance", 
          "Pizza", "Chocolate", "Sailing", "Camping"
        ];
        const randomTopic = SAFE_TOPICS[Math.floor(Math.random() * SAFE_TOPICS.length)];
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(randomTopic)}`);
        const data = await res.json();
        const text = data.extract;
        setParagraph(text);

        // Extract targets
        const aiRes = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "extract_targets", input: { text } })
        });
        const aiData = await aiRes.json();
        const rawTargets = aiData.targets || [];
        // Only keep targets that actually appear in the text (case-insensitive) to avoid impossible progress states
        const validTargets = rawTargets.filter((t: any) => {
          const escapedChunk = t.chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(escapedChunk, 'i').test(text);
        });
        setTargets(validTargets);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [paragraph, setParagraph, setTargets]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#A1A1AA]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Finding a topic and extracting chunks...</p>
      </div>
    );
  }

  const handleTargetClick = (idx: number) => {
    setActiveTarget(idx);
    setViewedTargets(prev => {
      const newSet = new Set(prev);
      newSet.add(idx);
      return newSet;
    });
  };

  const allViewed = targets.length > 0 && viewedTargets.size === targets.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-background-card p-8 rounded-2xl border border-border shadow-sm">
        <h2 className="text-xl font-bold mb-1">Phase 1: Read & Absorb</h2>
        <p className="text-[#E4E4E7] text-sm mb-6">Read the text below. Tap the highlighted chunks to learn them before you speak.</p>
        
        <div className="text-lg leading-relaxed text-foreground font-serif mb-8 p-6 bg-[#1C1F33] rounded-xl border border-[#2B2F4C]">
          {/* Simple highlight logic: this replaces the first occurrence of each chunk. For a robust app, use a proper tokenizer. */}
          {(() => {
            if (!paragraph) return null;
            let highlighted = paragraph;
            // Extremely naive highlighting for MVP
            targets.forEach((t, idx) => {
              const escapedChunk = t.chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(${escapedChunk})`, 'gi');
              highlighted = highlighted.replace(regex, `[[CHUNK_${idx}]]`);
            });

            const parts = highlighted.split(/(\[\[CHUNK_\d+\]\])/g);
            return parts.map((part, i) => {
              const match = part.match(/\[\[CHUNK_(\d+)\]\]/);
              if (match) {
                const idx = parseInt(match[1]);
                const t = targets[idx];
                const isViewed = viewedTargets.has(idx);
                return (
                  <span 
                    key={i} 
                    onClick={() => handleTargetClick(idx)}
                    className={cn(
                      "cursor-pointer px-1.5 py-0.5 rounded font-medium transition-colors",
                      isViewed ? "bg-[#2B5BFF]/20 text-[#2B5BFF] border-[#2B5BFF]/30" : "bg-[#2B5BFF]/40 text-white border-b-2 border-[#2B5BFF]",
                      activeTarget === idx && "ring-2 ring-indigo-400"
                    )}
                  >
                    {t?.chunk}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            });
          })()}
        </div>

        {activeTarget !== null && targets[activeTarget] && (
          <div className="mb-8 p-4 rounded-xl bg-[#1C1F33] border-[#2B2F4C] border border-white/10 backdrop-blur-sm animate-in slide-in-from-top-2">
            <h3 className="font-bold text-indigo-300 mb-1">{targets[activeTarget].chunk}</h3>
            <p className="text-indigo-100 text-sm mb-2">{targets[activeTarget].meaning}</p>
            <div className="text-xs text-indigo-200 bg-black/20 px-2 py-1.5 rounded inline-block border border-indigo-500/30">
              <span className="font-semibold">Why use it:</span> {targets[activeTarget].whyUseful}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-[#E4E4E7]">
            Learned {viewedTargets.size} / {targets.length} chunks
          </div>
          <button
            onClick={onComplete}
            disabled={!allViewed && targets.length > 0}
            className={cn(
              "flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all",
              allViewed || targets.length === 0
                ? "bg-gradient-to-r from-[#2B5BFF] to-[#1442DC] text-white border-none hover:opacity-90 shadow-md"
                : "bg-white/10 text-[#A1A1AA] cursor-not-allowed"
            )}
          >
            I'm ready to speak <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Phase 2: THINK
// ----------------------------------------------------------------------
function ThinkPhase({ 
  onComplete, 
  targets, 
  setPrompt, 
  prompt, 
  paragraph 
}: { 
  onComplete: () => void, 
  targets: any[], 
  setPrompt: (p: string) => void, 
  prompt: string | null, 
  paragraph: string | null 
}) {
  const [timeLeft, setTimeLeft] = useState(PREP_SECONDS);

  useEffect(() => {
    if (!prompt && paragraph) {
      async function gen() {
        try {
          const res = await fetch("/api/ai/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "gen_prompt", input: { topic: paragraph?.substring(0, 200) } })
          });
          if (!res.ok) throw new Error("API response not ok");
          const data = await res.json();
          if (data && data.prompt) {
            setPrompt(data.prompt);
          } else {
            throw new Error("Invalid prompt data");
          }
        } catch (e) {
          const FALLBACK_PROMPTS = [
            "Describe a place from your childhood that you still remember clearly.",
            "Would you rather live in a big city or a small town, and why?",
            "If you could instantly master any one skill, what would it be?",
            "Walk me through your perfect day off, from morning to night.",
            "Talk about a meal you will never forget.",
            "Books or films, which tells a better story? Make your case.",
            "Describe a hobby of yours to someone who has never tried it.",
            "Tell a story about a time something did not go as planned."
          ];
          const randomFallback = FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
          console.error(e);
          setPrompt(randomFallback);
        }
      }
      gen();
    }
  }, [prompt, paragraph, setPrompt]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  // Pre-warm the microphone so SpeakPhase is instant
  const [micError, setMicError] = useState<string | null>(null);
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Keep it pre-warmed, no need to stop tracks as SpeakPhase uses the global mic state
        })
        .catch(err => {
          console.error("Mic permission denied during pre-warm:", err);
          setMicError("Microphone access is required to speak. Please allow it in your browser settings.");
        });
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {micError && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl text-center font-medium">
          {micError}
        </div>
      )}
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-sm text-center">
        <h2 className="text-xl font-bold mb-4">Phase 2: Think & Plan</h2>
        
        <div className="w-24 h-24 mx-auto border-4 border-accent/20 rounded-full flex items-center justify-center mb-8 relative">
          <span className="text-3xl font-bold text-accent">{timeLeft}</span>
        </div>

        <div className="mb-8 p-6 bg-black/20 rounded-xl border border-white/5 text-left">
          <h3 className="font-semibold text-[#A1A1AA] text-sm uppercase tracking-wider mb-2">Your Prompt</h3>
          <p className="text-lg font-medium text-white">
            {prompt || "Generating prompt..."}
          </p>
        </div>

        <div className="mb-8 text-left">
          <h3 className="font-semibold text-[#A1A1AA] text-sm uppercase tracking-wider mb-3">Target Chunks to Use</h3>
          <div className="flex flex-wrap gap-2">
            {targets.map((t, idx) => (
              <div key={idx} className="px-3 py-1.5 bg-accent/20 text-accent rounded-lg border border-accent/30 font-medium">
                {t.chunk}
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={onComplete}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-accent text-accent-foreground font-semibold border-none hover:bg-accent/90 transition-colors"
        >
          Start speaking early <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Phase 3: SPEAK
// ----------------------------------------------------------------------
function SpeakPhase({ 
  onComplete, 
  targets, 
  setTranscript,
  setSpokenSeconds
}: { 
  onComplete: () => void, 
  targets: any[], 
  setTranscript: (t: string) => void,
  setSpokenSeconds: (s: number) => void
}) {
  const [timeLeft, setTimeLeft] = useState(SPEAK_SECONDS);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const phaseRef = useRef<string>("speak");
  const manualStopRef = useRef<boolean>(false);
  const [locale, setLocale] = useState("en-IN");

  useEffect(() => {
    if (typeof window !== "undefined" && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.lang = locale;

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setFinalTranscript(finalTranscriptRef.current);
        setInterimTranscript(interim);
      };

      recognitionRef.current.onend = () => {
        if (phaseRef.current === "speak" && !manualStopRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // Already started
          }
        }
      };

      recognitionRef.current.onerror = (e: any) => {
        if (e.error === "no-speech" || e.error === "network") return; // onend handles restart
        if (e.error === "aborted") return;
        console.error("Speech recognition error:", e.error);
      };

      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    } else {
      setFinalTranscript("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    }

    return () => {
      phaseRef.current = "unmounted";
      manualStopRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      }
    };
  }, [locale]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleStop();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]); // Removed transcript dependencies to prevent timer resets

  const handleStop = () => {
    phaseRef.current = "feedback";
    manualStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setTranscript(finalTranscriptRef.current + interimTranscript);
    setSpokenSeconds(SPEAK_SECONDS - timeLeft);
    onComplete();
  };

  const currentFullTranscript = finalTranscript + interimTranscript;

  const checkChunkUsed = (chunk: string) => {
    return currentFullTranscript.toLowerCase().includes(chunk.toLowerCase());
  };

  const chunksUsedCount = targets.filter(t => checkChunkUsed(t.chunk)).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-emerald-500/30 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /> Recording...
          </h2>
          <div className="flex items-center gap-4">
            <select 
              value={locale} 
              onChange={e => setLocale(e.target.value)}
              className="bg-[#1C1F33] text-[#A1A1AA] text-sm px-3 py-1 rounded-lg border border-[#2B2F4C] focus:outline-none focus:border-accent"
            >
              <option value="en-IN">en-IN (India)</option>
              <option value="en-US">en-US (USA)</option>
              <option value="en-GB">en-GB (UK)</option>
            </select>
            <div className="text-2xl font-bold font-mono text-emerald-500">
              0:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
        
        <div className="mb-8 min-h-[150px] p-6 bg-black/20 rounded-xl border border-white/5 text-lg text-white">
          <span>{finalTranscript}</span>
          <span className="text-white/60">{interimTranscript}</span>
          {!currentFullTranscript && <span className="text-[#A1A1AA] italic">Start speaking...</span>}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#A1A1AA] text-sm uppercase tracking-wider">Target Chunks to Use</h3>
            <span className="text-sm font-medium text-[#A1A1AA]">
              {chunksUsedCount} / {targets.length} used
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {targets.map((t, idx) => {
              const used = checkChunkUsed(t.chunk);
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "px-3 py-1.5 rounded-lg border font-medium transition-all duration-300",
                    used 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                      : "bg-[#1C1F33] border-[#2B2F4C]"
                  )}
                >
                  {t.chunk}
                </div>
              );
            })}
          </div>
        </div>
        
        <button
          onClick={handleStop}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
        >
          Stop speaking & Get feedback
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Phase 4: FEEDBACK
// ----------------------------------------------------------------------
function FeedbackPhase({ 
  onComplete, 
  paragraph, 
  targets, 
  prompt, 
  transcript,
  spokenSeconds
}: { 
  onComplete: () => void, 
  paragraph: string | null, 
  targets: any[], 
  prompt: string | null, 
  transcript: string,
  spokenSeconds: number
}) {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    async function analyze() {
      try {
        const [speakRes, vocabRes, ltRes] = await Promise.allSettled([
          fetch("/api/ai/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "speak", input: { text: transcript }, stream: false })
          }).then(async res => {
            if (!res.ok) throw new Error(await res.text());
            return res.json();
          }),
          fetch("/api/ai/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "vocab_upgrade", input: { text: transcript, targets: targets.map(t => t.chunk) } })
          }).then(async res => {
            if (!res.ok) throw new Error(await res.text());
            return res.json();
          }),
          fetch("https://api.languagetoolplus.com/v2/check", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              text: transcript,
              language: "en-US"
            })
          }).then(res => res.json())
        ]);

        const speakData = speakRes.status === "fulfilled" ? speakRes.value : null;
        const vocabData = vocabRes.status === "fulfilled" ? vocabRes.value : null;
        const ltData = ltRes.status === "fulfilled" ? ltRes.value : null;

        setFeedback({
          speak: speakData,
          vocab: vocabData,
          grammar: ltData?.matches || []
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    if (transcript.length > 5) {
      analyze();
    } else {
      setLoading(false);
    }
  }, [transcript, targets]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#A1A1AA]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Analyzing fluency, vocabulary, and grammar...</p>
      </div>
    );
  }

  if (transcript.length <= 5) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-4">No speech detected</h2>
        <button onClick={() => window.location.reload()} className="text-[#2B5BFF] underline">Try again</button>
      </div>
    );
  }

  const chunksUsed = targets.filter(t => transcript.toLowerCase().includes(t.chunk.toLowerCase()));
  const chunksMissed = targets.filter(t => !transcript.toLowerCase().includes(t.chunk.toLowerCase()));

  // Deterministic metrics calculation
  const wordCount = transcript.trim().split(/\s+/).length;
  const effectiveSeconds = spokenSeconds || SPEAK_SECONDS; // Guard against 0 duration
  const calculatedWpm = Math.round(wordCount / (effectiveSeconds / 60));
  
  const fillerRegex = /\b(um|uh|er|like|you know|I mean|basically|actually|sort of|kind of)\b/gi;
  const computedFillers = (transcript.match(fillerRegex) || []).length;
  const chunksUsedCount = chunksUsed.length;

  // Fallback Score
  let displayScore = feedback?.speak?.fluencyScore;
  if (typeof displayScore !== "number") {
    const wpmScore = Math.min(100, Math.max(0, 100 - Math.abs(130 - calculatedWpm)));
    const chunkScore = (chunksUsedCount / Math.max(1, targets.length)) * 100;
    const fillerPenalty = Math.min(30, computedFillers * 2);
    displayScore = Math.round((wpmScore + chunkScore) / 2 - fillerPenalty);
    if (displayScore < 0) displayScore = 0;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 shadow-sm">
        <h2 className="text-2xl font-bold mb-8">Your Feedback</h2>
        
        <div className="flex items-center gap-8 mb-8">
          <div className="w-24 h-24 rounded-full border-8 border-accent/20 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold text-accent">{displayScore}</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Fluency Score</h3>
            <p className="text-[#A1A1AA] text-sm">Words per minute: {calculatedWpm}</p>
            <p className="text-[#A1A1AA] text-sm">Fillers used: {computedFillers}</p>
          </div>
        </div>

        <hr className="my-8 border-white/10" />

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-emerald-400 mb-4">Chunks You Nailed ({chunksUsed.length})</h3>
            <div className="space-y-2">
              {chunksUsed.map((t, i) => (
                <div key={i} className="p-3 bg-emerald-500/10 rounded-xl text-emerald-300 text-sm flex gap-2 border border-emerald-500/20">
                  <span>✓</span> {t.chunk}
                </div>
              ))}
              {chunksUsed.length === 0 && <p className="text-sm text-[#A1A1AA]">None used this time.</p>}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-red-400 mb-4">Missed Opportunities ({chunksMissed.length})</h3>
            <div className="space-y-2">
              {chunksMissed.map((t, i) => {
                const missedInfo = feedback?.vocab?.missedTargets?.find((m: any) => m.chunk === t.chunk);
                return (
                  <div key={i} className="p-3 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-sm">
                    <span className="font-semibold block mb-1">✗ {t.chunk}</span>
                    {missedInfo && <span className="opacity-80">Could have fit: {missedInfo.whereItWouldHaveFit}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <hr className="my-8 border-white/10" />

        {/* Vocab Upgrades */}
        <h3 className="font-bold mb-4">Say this instead (Vocab Upgrades)</h3>
        <div className="space-y-3 mb-8">
          {feedback?.vocab?.upgrades?.map((u: any, i: number) => (
            <div key={i} className="p-4 rounded-xl border border-neutral-200/10 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-neutral-400 line-through">"{u.youSaid}"</span>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
                <span className="font-bold text-accent">"{u.tryInstead}"</span>
              </div>
              <p className="text-sm text-neutral-300">{u.meaning} <span className="text-neutral-500">({u.register})</span></p>
              <div className="text-xs bg-white/20 p-2 rounded text-neutral-400">
                <span className="font-semibold">Scenario:</span> {u.scenario}
              </div>
            </div>
          ))}

          {loading && !feedback?.vocab && (
             <div className="p-4 rounded-xl border border-white/5 animate-pulse bg-white/5 h-20"></div>
          )}
          
          {!loading && !feedback?.vocab && (
             <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center">
                <p className="text-sm text-red-300 mb-2">Couldn't load suggestions.</p>
                <button onClick={() => window.location.reload()} className="text-sm text-red-400 underline">Retry</button>
             </div>
          )}

          {!loading && feedback?.vocab && feedback.vocab.upgrades?.length === 0 && feedback.vocab.overused?.length === 0 && (
            <p className="text-sm text-neutral-300">No major vocabulary upgrades needed!</p>
          )}
        </div>

        <button
          onClick={onComplete}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 transition-all mt-8"
        >
          Save Misses to Spaced Repetition & Finish
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// DONE
// ----------------------------------------------------------------------
function DonePhase() {
  return (
    <div className="text-center py-20 animate-in zoom-in duration-500">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold mb-2">Cycle Complete!</h2>
      <p className="text-neutral-400 mb-8">Great job absorbing and using those new phrases.</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#2B5BFF] to-[#1442DC] text-white font-medium hover:opacity-90 transition-opacity"
      >
        Start Another Cycle
      </button>
    </div>
  );
}
