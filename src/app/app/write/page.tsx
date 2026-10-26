"use client";
import { useRef, useState } from "react";
import { AnalysisResults, GrammarErrorHighlighter } from "@/components/nlp/AnalysisResults";
import { WritingFeedback } from "@/components/ai-feedback/WritingFeedback";
import { analyzeText, completePractice, replaceSpan, requestJSON } from "@/lib/nlp/client";
import type { AnalysisEnvelope, GrammarError } from "@/lib/nlp/contracts";
import { WritingSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

const PROMPTS = [
  "Write about a time you had to step out of your comfort zone.",
  "Describe a technology that has changed your life and explain how.",
  "Write a letter to your future self, 5 years from now.",
  "Argue for or against: Social media does more harm than good.",
  "Describe the most beautiful place you've ever seen.",
  "Write about a lesson you learned the hard way.",
  "Explain why a particular hobby is important to you.",
  "Describe your ideal work environment and why it suits you.",
  "Write about a person who deserves more recognition and why.",
  "Argue for or against: Remote work is the future of employment.",
  "Describe a cultural tradition that is meaningful to you.",
  "Write about a problem in your community and propose a solution.",
];
export default function WritePage() {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisEnvelope | null>(null);
  const [fallback, setFallback] = useState<GrammarError[]>([]);
  const [polish, setPolish] = useState<z.infer<typeof WritingSchema> | null>(null);
  const [register, setRegister] = useState<"neutral" | "formal" | "informal">("neutral");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const attempt = useRef<string | null>(null);
  const writing = useRef<string | null>(null);
  const ensureAttempt = () => attempt.current ||= crypto.randomUUID();
  function edit(value: string) { if (saved.startsWith("Both drafts")) attempt.current=null; setDraft(value); setResult(null); setFallback([]); setPolish(null); setSaved(""); }
  async function analyze() {
    setBusy(true); setError(""); setResult(null); setFallback([]);
    try { setResult(await analyzeText({ attempt_id: ensureAttempt(), mode: "write", text: draft, prompt: PROMPTS[index], target_register: register })); }
    catch (e) {
      setError(e instanceof Error ? e.message : "NLP unavailable.");
      try { const checked = await requestJSON<{ errors: GrammarError[] }>("/api/grammar/check", { method: "POST", body: JSON.stringify({ text: draft }) }); setFallback(checked.errors); setError("NLP unavailable. Showing LanguageTool grammar suggestions only; no overall score."); }
      catch { /* Retain text and explicit original failure. */ }
    } finally { setBusy(false); }
  }
  async function saveOriginal() {
    setBusy(true); setError(""); writing.current ||= crypto.randomUUID();
    try {
      await requestJSON("/api/learning/draft", { method: "POST", body: JSON.stringify({ id: writing.current, prompt: PROMPTS[index], draft_v1: draft }) });
      setOriginal(draft); setResult(null); setFallback([]); setSaved("Original draft saved. Now revise it in your own words.");
    } catch (e) { setError(e instanceof Error ? e.message : "Draft save failed."); }
    finally { setBusy(false); }
  }
  async function saveFinal() {
    setBusy(true); setError("");
    try {
      const data = await completePractice({ attempt_id: ensureAttempt(), activity: "write", analysis_id: result?.analysis_id,
        payload: { prompt: PROMPTS[index], draft_v1: original ?? draft, draft_v2: draft, writing_id: writing.current, word_count: draft.trim().split(/\s+/).filter(Boolean).length } });
      setSaved(`Both drafts saved. ${data.xp_awarded} XP awarded.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Writing save failed."); }
    finally { setBusy(false); }
  }
  async function generatePolish() {
    setBusy(true); setError("");
    try { setPolish(WritingSchema.parse(await requestJSON("/api/ai/analyze", { method: "POST", body: JSON.stringify({ mode: "write", input: { text: draft, targetRegister: register }, stream: false }) }))); }
    catch (e) { setError(e instanceof Error ? e.message : "Optional AI polish unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl mx-auto space-y-6"><header><h1 className="text-2xl font-bold">Write & rewrite</h1><p className="text-foreground-muted mt-2">Keep your meaning. Review each suggestion before applying it.</p></header>
    <section className="nlp-panel space-y-4"><p className="text-lg">{PROMPTS[index]}</p>{original === null && <button className="text-sm text-accent underline" disabled={busy || !!draft.trim()} onClick={() => setIndex((i) => (i+1)%PROMPTS.length)}>Different prompt</button>}
      <label className="flex gap-3 items-center text-sm">Target register<select className="nlp-input w-auto" value={register} onChange={(e) => { setRegister(e.target.value as typeof register); setResult(null); setPolish(null); }}><option value="neutral">Neutral</option><option value="formal">Formal</option><option value="informal">Informal</option></select></label>
      <label className="block text-sm" htmlFor="writing-draft">{original === null ? "First draft" : "Your rewrite"}</label><textarea id="writing-draft" className="nlp-input min-h-64" maxLength={12000} value={draft} disabled={busy} onChange={(e) => edit(e.target.value)} placeholder="Start writing…" /><p className="text-xs text-foreground-muted">{draft.trim() ? draft.trim().split(/\s+/).length : 0} words · {draft.length}/12000 characters</p>
      <div className="flex gap-3 flex-wrap"><button className="nlp-button" disabled={busy || !draft.trim()} onClick={analyze}>{busy ? "Working…" : "Analyze writing"}</button>{original === null ? <button className="nlp-button" disabled={busy || !draft.trim()} onClick={saveOriginal}>Save first draft & start rewrite</button> : <button className="nlp-button" disabled={busy || !draft.trim() || saved.startsWith("Both drafts")} onClick={saveFinal}>Save rewrite & finish</button>}<button className="text-sm text-accent underline" disabled={busy || !draft.trim()} onClick={generatePolish}>Generate optional AI polish</button></div>
    </section>
    {error && <p role="alert" className="text-amber-200">{error}</p>}{saved && <p role="status" className="text-emerald-300">{saved}</p>}
    {original !== null && <details className="nlp-panel"><summary className="cursor-pointer">Compare your original draft</summary><p className="whitespace-pre-wrap mt-4">{original}</p></details>}
    {result && <AnalysisResults analysis={result.analysis} onAccept={(e) => { edit(replaceSpan(draft, e.start, e.end, e.replacements[0])); setSaved("Suggestion applied. Analyze again to refresh remaining error positions."); }} />}
    {fallback.length > 0 && <section className="nlp-panel space-y-4"><GrammarErrorHighlighter text={draft} errors={fallback} />{fallback.map((e) => <div key={e.id} className="text-sm space-y-2"><p>{e.original} → {e.replacements.join(" / ")}: {e.explanation}</p>{e.replacements[0] && <button className="nlp-button" onClick={() => edit(replaceSpan(draft,e.start,e.end,e.replacements[0]))}>Accept suggestion</button>}</div>)}</section>}
    {polish && <section className="space-y-4"><p className="text-sm text-foreground-muted">Optional AI coaching. Scores below are model estimates, separate from the deterministic practice metric. Review facts and meaning before using the rewrite.</p><WritingFeedback data={polish} originalText={draft} /><button className="nlp-button" onClick={() => edit(polish.rewrite)}>Use this polished version in my editor</button></section>}
  </div>;
}
