"use client";
import { useRef, useState } from "react";
import { SpeechRecorder } from "@/components/nlp/SpeechRecorder";
import { AnalysisResults } from "@/components/nlp/AnalysisResults";
import { analyzeText, completePractice } from "@/lib/nlp/client";
import type { AnalysisEnvelope } from "@/lib/nlp/contracts";

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
  const [promptIndex, setPromptIndex] = useState(0);
  const [result, setResult] = useState<AnalysisEnvelope | null>(null);
  const [response, setResponse] = useState<{ text: string; duration: number | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const attempt = useRef<string | null>(null);
  async function analyze(text: string, duration: number | null) {
    setResponse({ text, duration }); setBusy(true); setError(""); setSaved(""); setResult(null); attempt.current = crypto.randomUUID();
    try { setResult(await analyzeText({ attempt_id: attempt.current, mode: "speak", text, prompt: PROMPTS[promptIndex], duration_seconds: duration })); }
    catch (e) { setError(e instanceof Error ? e.message : "Analysis failed."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!attempt.current) return;
    setBusy(true); setError("");
    try {
      const data = await completePractice({ attempt_id: attempt.current, activity: "speak", analysis_id: result?.analysis_id, payload: { prompt: PROMPTS[promptIndex], transcript: response?.text, duration_seconds: response?.duration } });
      setSaved(`Speaking saved. ${data.xp_awarded} XP awarded.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl mx-auto space-y-6"><header><h1 className="text-2xl font-bold">Speak & think out loud</h1><p className="text-foreground-muted mt-2">Two minutes of personal speaking practice, followed by measured feedback.</p></header>
    <section className="nlp-panel space-y-4"><p className="text-lg">{PROMPTS[promptIndex]}</p><button className="text-sm text-accent underline" onClick={() => { setPromptIndex((i) => (i+1)%PROMPTS.length); setResult(null); setResponse(null); setSaved(""); }} disabled={busy || !!response}>Different prompt</button></section>
    <SpeechRecorder key={promptIndex} seconds={120} onComplete={analyze} />
    {busy && <p role="status">Analyzing or saving…</p>}{error && <p role="alert" className="text-amber-200">{error}</p>}
    {response && !result && !busy && <div className="flex gap-3 flex-wrap"><button className="nlp-button" onClick={() => analyze(response.text, response.duration)}>Retry NLP analysis</button><button className="nlp-button" onClick={save}>Save practice without analysis</button></div>}
    {result && <><AnalysisResults analysis={result.analysis} /><button className="nlp-button" disabled={busy || !!saved} onClick={save}>Save speaking session</button></>}
    {saved && <div className="space-y-3"><p role="status" className="text-emerald-300">{saved}</p><button className="nlp-button" onClick={() => {setPromptIndex((i) => (i+1)%PROMPTS.length);setResponse(null);setResult(null);setSaved("");}}>Practice another prompt</button></div>}
  </div>;
}
