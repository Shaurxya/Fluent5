"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrainCircuit, Loader2 } from "lucide-react";
import { z } from "zod";
import { analyzeText, completePractice, requestJSON } from "@/lib/nlp/client";
import type { AnalysisEnvelope, LearningChunk } from "@/lib/nlp/contracts";
import { AnalysisResults, correctionChunks, SavePhraseButton } from "@/components/nlp/AnalysisResults";
import { PhraseMeaning } from "@/components/nlp/PhraseMeaning";
import { ReadingInsights } from "@/components/nlp/ReadingInsights";
import { SpeechRecorder } from "@/components/nlp/SpeechRecorder";
import { GenPromptSchema } from "@/lib/ai/schemas";

const passageSchema = z.object({ title: z.string(), text: z.string().min(1).max(12000), source: z.string(), attribution: z.string() });
type Passage = z.infer<typeof passageSchema>;
type Step = "read" | "think" | "speak" | "feedback" | "done";

export default function FluencyCyclePage() {
  const [step, setStep] = useState<Step>("read");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [reading, setReading] = useState<AnalysisEnvelope | null>(null);
  const [result, setResult] = useState<AnalysisEnvelope | null>(null);
  const [prompt, setPrompt] = useState("");
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [prep, setPrep] = useState(45);
  const [viewed, setViewed] = useState<string[]>([]);
  const [remember, setRemember] = useState<LearningChunk[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState("");
  const attempt = useRef<string | null>(null);
  const ensureAttempt = () => attempt.current ||= crypto.randomUUID();
  const targets = reading?.analysis.vocabulary.chunks.slice(0, 5).map((c) => c.text) || [];

  async function load(signal?: AbortSignal) {
    setBusy(true); setError(""); setLoadError("");
    try {
      const p = passageSchema.parse(await requestJSON("/api/learning/passage", { signal }));
      if (signal?.aborted) return;
      setPassage(p); setReading(null); setViewed([]);
      try {
        const r = await analyzeText({ attempt_id: ensureAttempt(), mode: "read", text: p.text }, signal);
        if (!signal?.aborted) setReading(r);
      } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "Reading analysis unavailable. You can still practice with the passage."); }
    } catch (e) { if (!signal?.aborted) setLoadError(e instanceof Error ? e.message : "Could not load a passage."); }
    finally { if (!signal?.aborted) setBusy(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    requestJSON("/api/learning/passage", {signal:controller.signal}).then(async (raw) => {
      const p = passageSchema.parse(raw);
      if (controller.signal.aborted) return;
      setPassage(p); setBusy(true);
      attempt.current ||= crypto.randomUUID();
      try { const r = await analyzeText({attempt_id:attempt.current,mode:"read",text:p.text},controller.signal); if (!controller.signal.aborted) setReading(r); }
      catch(e) {if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Reading analysis unavailable.");}
      finally {if (!controller.signal.aborted) setBusy(false);}
    }).catch((e) => {if (!controller.signal.aborted) setLoadError(e instanceof Error ? e.message : "Could not load a passage.");});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (step !== "think") return;
    const started = performance.now();
    const timer = setInterval(() => { const remaining = Math.max(0,45-Math.floor((performance.now()-started)/1000)); setPrep(remaining); if (remaining === 0) setStep("speak"); }, 250);
    return () => clearInterval(timer);
  }, [step]);

  async function prepare() {
    if (!passage) return;
    setError(""); setBusy(true);
    // Safe, answerable fallback keeps the exercise usable without a paid AI key.
    let nextPrompt = `What does ${passage.title.toLowerCase()} remind you of in your own life? Describe an experience, preference, or something you would like to try. Try to use three of your target phrases.`;
    try {
      const data = GenPromptSchema.parse(await requestJSON("/api/ai/analyze", { method: "POST", body: JSON.stringify({ mode: "gen_prompt", input: { topic: passage.title, speakSeconds: 90, minChunksToUse: Math.min(3, targets.length) } }) }));
      nextPrompt = data.prompt;
    } catch { /* Optional contextual prompt; the transparent local fallback above remains useful. */ }
    setPrompt(nextPrompt); setPrep(45); setStep("think"); setBusy(false);
  }
  async function analyze(text = transcript, seconds = duration) {
    setTranscript(text); setDuration(seconds); setStep("feedback"); setBusy(true); setError(""); setResult(null);
    try {
      const next = await analyzeText({ attempt_id: ensureAttempt(), mode: "cycle", text, duration_seconds: seconds, prompt, targets });
      setResult(next);
      const chunks: LearningChunk[] = [...targets.filter((t) => !next.analysis.semantics.matches.some((m) => m.target === t && m.matched)).map((t) => ({ text: t, note: `Practice using this phrase in a new response about ${passage?.title}.` })),
        ...correctionChunks(next.analysis), ...next.analysis.vocabulary.suggestions.map((s) => ({ text: s.suggestion, note: s.reason }))];
      const unique = chunks.filter((c, i) => chunks.findIndex((x) => x.text.toLowerCase() === c.text.toLowerCase()) === i).slice(0, 30);
      setRemember(unique); setSelected(unique.map((c) => c.text));
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed. Your transcript is kept."); }
    finally { setBusy(false); }
  }
  async function finish() {
    if (!result) return;
    setBusy(true); setError("");
    try {
      const saved = await completePractice({ attempt_id: ensureAttempt(), activity: "speak", analysis_id: result.analysis_id,
        payload: { workflow: "cycle", prompt, passage_title: passage?.title, targets, duration_seconds: duration }, chunks: remember.filter((c) => selected.includes(c.text)) });
      setSavedMessage(`Session saved. ${saved.chunks_saved} new phrases added to review. ${saved.xp_awarded} XP awarded.`); setStep("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed. Retry without leaving this page."); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl mx-auto space-y-6 pb-12">
    <header><h1 className="text-2xl font-bold flex gap-3 items-center"><BrainCircuit className="text-accent" /> Fluency Cycle</h1><p className="text-foreground-muted mt-2">Read → Think → Speak → Remember</p></header>
    <ol className="flex flex-wrap gap-3 text-sm" aria-label="Practice steps">{["read", "think", "speak", "feedback", "done"].map((s) => <li key={s} aria-current={step === s ? "step" : undefined} className={`capitalize px-3 py-2 rounded-lg ${step === s ? "bg-accent text-white" : "bg-background-secondary text-foreground-muted"}`}>{s}</li>)}</ol>
    {error && <p role="alert" className="p-4 rounded-xl border border-amber-400/30 text-amber-200">{error}</p>}
    {busy && <p role="status" className="flex gap-2 items-center text-foreground-muted"><Loader2 className="animate-spin w-4 h-4" />{step === "feedback" ? "Analyzing or saving your practice…" : "Preparing your exercise…"}</p>}
    {step === "read" && <>
      {loadError && <div role="alert" className="nlp-panel"><p>{loadError}</p><button className="nlp-button mt-4" onClick={() => load()}>Retry passage</button></div>}
      {passage && <section className="nlp-panel space-y-5"><h2 className="text-xl font-semibold">Read & absorb: {passage.title}</h2><p className="whitespace-pre-wrap text-lg leading-relaxed">{passage.text}</p><p className="text-xs text-foreground-muted">{passage.source.startsWith("https://") ? <a href={passage.source} target="_blank" rel="noreferrer" className="underline">Source: Wikipedia</a> : passage.source} · {passage.attribution}</p>
      <p className="text-sm text-foreground-muted">Tap each target phrase to mark it studied. These phrases occur in the passage.</p><div className="flex flex-wrap gap-3">{targets.map((t) => <div className="border border-border rounded-xl p-3 space-y-2" key={t}><button className="text-left text-accent" onClick={() => setViewed((v) => v.includes(t) ? v : [...v,t])}>{viewed.includes(t) ? "✓ " : "○ "}{t}</button><PhraseMeaning phrase={t} context={passage.text} /><div><SavePhraseButton chunk={{ text: t, note: `From ${passage.title}: ${passage.text.slice(0,500)}` }} /></div></div>)}</div>
      <div className="flex gap-3 flex-wrap"><button className="nlp-button" disabled={busy || targets.some((t) => !viewed.includes(t))} onClick={prepare}>I’m ready to think & speak</button><button className="text-sm text-foreground-muted underline" disabled={busy} onClick={() => load()}>Different passage</button></div></section>}
      {reading && <ReadingInsights result={reading} />}
    </>}
    {step === "think" && <section className="nlp-panel text-center space-y-6"><h2 className="text-xl font-semibold">Think & plan</h2><p className="text-5xl text-accent font-mono" aria-live="off">{prep}s</p><p className="text-lg">{prompt}</p><details className="text-left"><summary className="cursor-pointer text-accent">Optional vocabulary hints</summary><p className="mt-3">{targets.join(" · ") || "Use expressions from the passage in your own words."}</p></details><p className="text-xs text-foreground-muted">Plan a few ideas. There is no sample answer to memorize.</p><button className="nlp-button" onClick={() => setStep("speak")}>Start speaking early</button></section>}
    {step === "speak" && <><p className="nlp-panel text-lg">{prompt}</p><SpeechRecorder seconds={90} targets={targets} onComplete={(t, d) => analyze(t,d)} /></>}
    {step === "feedback" && <>
      {!result && !busy && <section className="nlp-panel space-y-4"><h2 className="text-lg font-semibold">Your transcript is kept</h2><p className="whitespace-pre-wrap">{transcript}</p><button className="nlp-button" onClick={() => analyze()}>Retry analysis</button></section>}
      {result && <><AnalysisResults analysis={result.analysis} /><section className="nlp-panel space-y-4"><h2 className="text-lg font-semibold">Remember what you learned</h2><p className="text-sm text-foreground-muted">Choose corrections and missed phrases to add to your existing SM-2 flashcards.</p>{remember.map((c) => <label className="flex gap-3 items-start" key={c.text}><input type="checkbox" className="mt-1" checked={selected.includes(c.text)} onChange={(e) => setSelected((s) => e.target.checked ? [...s,c.text] : s.filter((t) => t !== c.text))} /><span>{c.text}<span className="block text-xs text-foreground-muted mt-1">{c.note}</span></span></label>)}{remember.length === 0 && <p>No missed targets or corrections to save. You can save useful phrases above.</p>}<button className="nlp-button" disabled={busy} onClick={finish}>Save selected phrases & finish</button></section></>}
    </>}
    {step === "done" && <section className="nlp-panel text-center space-y-5"><h2 className="text-3xl font-semibold">Cycle complete</h2><p role="status">{savedMessage}</p><div className="flex gap-3 justify-center flex-wrap"><Link className="nlp-button" href="/app/review">Review saved phrases</Link><Link className="nlp-button" href="/app/progress">View progress</Link><button className="nlp-button" onClick={() => window.location.reload()}>Practice again</button></div></section>}
  </div>;
}
