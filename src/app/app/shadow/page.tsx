"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SpeechRecorder } from "@/components/nlp/SpeechRecorder";
import { AnalysisResults } from "@/components/nlp/AnalysisResults";
import { analyzeText, completePractice } from "@/lib/nlp/client";
import type { AnalysisEnvelope } from "@/lib/nlp/contracts";
import type { Sentence, Difficulty } from "@/lib/supabase/types";

export default function ShadowPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [result, setResult] = useState<AnalysisEnvelope | null>(null);
  const [response, setResponse] = useState<{ text: string; duration: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [recorderKey, setRecorderKey] = useState(0);
  const attempt = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const loadSentence = useCallback(async () => {
    const supabase = createClient();
    const { data, error: loadError } = await supabase.from("sentences").select("*").eq("level", difficulty);
    setError(loadError ? "Could not load sentences. Check your connection and seed data." : "");
    setSentence(data?.length ? data[Math.floor(Math.random()*data.length)] as Sentence : null);
    setResult(null); setResponse(null); setSaved(""); setPlaying(false); setRecorderKey((k) => k+1);
    audio.current?.pause(); audio.current = null; if (url.current) URL.revokeObjectURL(url.current); url.current = null;
  }, [difficulty]);
  useEffect(() => {
    let active = true;
    createClient().from("sentences").select("*").eq("level",difficulty).then(({data,error}) => {
      if (!active) return;
      setSentence(data?.length ? data[Math.floor(Math.random()*data.length)] as Sentence : null);
      setError(error ? "Sentences could not be loaded." : ""); setResult(null); setResponse(null); setSaved(""); setPlaying(false); setRecorderKey((k) => k+1);
    });
    return () => { active=false; audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); window.speechSynthesis?.cancel(); }; }, [difficulty]);
  async function playModel() {
    if (!sentence) return;
    setPlaying(true); setError("");
    try {
      if (!audio.current) {
        const response = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: sentence.text }) });
        if (!response.ok) { const data = await response.json(); throw new Error(data.error?.message || "Model audio unavailable."); }
        url.current = URL.createObjectURL(await response.blob()); audio.current = new Audio(url.current);
        audio.current.playbackRate = difficulty === "hard" ? 1.1 : difficulty === "med" ? 1 : 0.9;
        audio.current.onended = () => setPlaying(false); audio.current.onerror = () => setPlaying(false);
      }
      await audio.current.play();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not play model audio."); setPlaying(false); }
  }
  function browserVoice() {
    if (!sentence || !window.speechSynthesis) { setError("Browser voice is unavailable."); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(sentence.text); utterance.lang = "en-GB"; utterance.rate = 0.9; window.speechSynthesis.speak(utterance);
  }
  async function analyze(text: string, duration: number | null) {
    if (!sentence) return;
    setBusy(true); setError(""); setSaved(""); setResponse({ text, duration }); attempt.current = crypto.randomUUID();
    try { setResult(await analyzeText({ attempt_id: attempt.current, mode: "shadow", text, reference: sentence.text, duration_seconds: duration })); }
    catch (e) { setError(e instanceof Error ? e.message : "Comparison failed. Your response is kept."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!attempt.current) return;
    setBusy(true); setError("");
    try {
      const data = await completePractice({ attempt_id: attempt.current, activity: "shadow", analysis_id: result?.analysis_id,
        payload: { sentence_id: sentence?.id, difficulty, reference: sentence?.text, transcript: response?.text } });
      setSaved(`Shadowing saved. ${data.xp_awarded} XP awarded.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl mx-auto space-y-6"><header><h1 className="text-2xl font-bold">Shadowing</h1><p className="text-foreground-muted mt-2">Listen, repeat, replay your recording, and compare recognized words.</p></header>
    <section className="nlp-panel space-y-4"><label className="flex gap-3 items-center">Difficulty<select className="nlp-input w-auto" value={difficulty} disabled={busy || playing} onChange={(e) => setDifficulty(e.target.value as Difficulty)}><option value="easy">Easy</option><option value="med">Intermediate</option><option value="hard">Advanced</option></select></label><p className="text-xl leading-relaxed">{sentence?.text || "Loading a model sentence. If none appears, load the seed data."}</p><div className="flex gap-3 flex-wrap"><button className="nlp-button" disabled={!sentence || playing} onClick={playModel}>{playing ? "Playing…" : "Play ElevenLabs model"}</button><button className="text-sm text-accent underline" onClick={browserVoice}>Use browser voice</button><button className="text-sm text-accent underline" disabled={busy || playing} onClick={loadSentence}>New sentence</button></div></section>
    {sentence && <SpeechRecorder key={recorderKey} seconds={90} recordAudio onComplete={analyze} />}
    {busy && <p role="status">Comparing or saving…</p>}{error && <p role="alert" className="text-amber-200">{error}</p>}
    {result && <AnalysisResults analysis={result.analysis} />}
    {response && !busy && !result && <button className="nlp-button" onClick={() => analyze(response.text,response.duration)}>Retry word comparison</button>}
    {response && <button className="nlp-button" disabled={busy || !!saved} onClick={save}>{result ? "Save shadowing practice" : "Save practice without analysis"}</button>}
    {saved && <p role="status" className="text-emerald-300">{saved}</p>}
  </div>;
}
