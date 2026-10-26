"use client";

import { useState } from "react";
import type { Analysis, GrammarError, LearningChunk } from "@/lib/nlp/contracts";
import { saveChunks } from "@/lib/nlp/client";

export function GrammarErrorHighlighter({ text, errors }: { text: string; errors: GrammarError[] }) {
  const chars = Array.from(text);
  const parts = [];
  let cursor = 0;
  for (const error of [...errors].sort((a, b) => a.start - b.start)) {
    if (error.start < cursor || error.end > chars.length || error.end < error.start) continue;
    parts.push(<span key={`text-${cursor}`}>{chars.slice(cursor, error.start).join("")}</span>);
    parts.push(<mark key={error.id} title={`${error.category}: ${error.explanation}`} className="bg-amber-400/20 text-amber-100 border-b border-amber-400 rounded px-0.5">{chars.slice(error.start, error.end).join("") || "∣"}</mark>);
    cursor = error.end;
  }
  parts.push(<span key="remaining">{chars.slice(cursor).join("")}</span>);
  return <div className="whitespace-pre-wrap leading-relaxed" aria-label="Text with suggested corrections">{parts}</div>;
}

export function SavePhraseButton({ chunk }: { chunk: LearningChunk }) {
  const [status, setStatus] = useState<"ready" | "saving" | "saved">("ready");
  const [error, setError] = useState("");
  async function save() {
    setStatus("saving"); setError("");
    try { await saveChunks([chunk]); setStatus("saved"); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed."); setStatus("ready"); }
  }
  return <span className="inline-flex flex-col items-start gap-1"><button type="button" className="text-xs px-3 py-2 rounded-lg border border-border hover:border-accent disabled:opacity-50" disabled={status !== "ready"} onClick={save}>{status === "saved" ? "Saved to review" : status === "saving" ? "Saving…" : "Save phrase"}</button>{error && <span role="alert" className="text-xs text-red-300">{error}</span>}</span>;
}

export function correctionChunks(analysis: Analysis): LearningChunk[] {
  return analysis.grammar.errors.filter((e) => e.replacements.length > 0).map((e) => ({ text: e.replacements[0], note: `Instead of “${e.original}”: ${e.explanation}`, context: { original: e.original, sentence: analysis.text, category: e.category } }));
}

export function AnalysisResults({ analysis, onAccept }: { analysis: Analysis; onAccept?: (error: GrammarError) => void }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const errors = analysis.grammar.errors.filter((e) => !dismissed.includes(e.id));
  return <div className="space-y-6" data-testid="analysis-results">
    {analysis.warnings.length > 0 && <div role="status" className="p-4 rounded-xl border border-amber-400/30 bg-amber-400/5 text-sm text-amber-100 space-y-1">{analysis.warnings.map((w) => <p key={w}>{w}</p>)}</div>}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Metric label="Practice score" value={analysis.fluency.score?.value ?? "Too short"} />
      <Metric label="Words per minute" value={analysis.fluency.words_per_minute ?? "Not measured"} />
      <Metric label="Possible fillers" value={analysis.fluency.filler_count} />
      <Metric label="Words" value={analysis.vocabulary.word_count} />
    </div>
    <p className="text-xs text-foreground-muted">{analysis.fluency.score?.label || "No overall score for this activity or short sample."}</p>
    <section className="nlp-panel"><h2 className="text-lg font-semibold mb-4">Your text & grammar suggestions</h2>
      <GrammarErrorHighlighter text={analysis.text} errors={errors} />
      <div className="mt-5 space-y-3">{errors.length === 0 && <p className="text-sm text-foreground-muted">No issues flagged by the available detectors. This does not guarantee error-free English.</p>}
      {errors.map((e) => <div key={e.id} className="p-4 bg-background-secondary rounded-xl border border-border space-y-2">
        <p className="text-xs uppercase tracking-wide text-accent">{e.category.replaceAll("_", " ")} · {e.source}</p>
        <p><span className="text-amber-200">{e.original || "Missing text"}</span> → <span className="text-emerald-300">{e.replacements.join(" / ") || "Review this expression"}</span></p>
        <p className="text-sm text-foreground-muted">{e.explanation}</p>
        <div className="flex flex-wrap gap-2 items-center">{e.replacements[0] && <SavePhraseButton chunk={correctionChunks(analysis).find((c) => c.context?.original === e.original) || { text: e.replacements[0], note: e.explanation }} />}
          {onAccept && e.replacements[0] && <button type="button" onClick={() => onAccept(e)} className="text-xs px-3 py-2 rounded-lg bg-accent text-white">Accept suggestion</button>}
          <button type="button" onClick={() => setDismissed((d) => [...d, e.id])} className="text-xs px-3 py-2 text-foreground-muted">Dismiss</button>
        </div>
      </div>)}</div>
      <p className="text-xs text-foreground-muted mt-4">{analysis.grammar.note}</p>
      {analysis.grammar.corrected_text !== analysis.text && <details className="mt-4"><summary className="cursor-pointer text-sm text-accent">Compare suggested correction</summary><p className="mt-3 whitespace-pre-wrap">{analysis.grammar.corrected_text}</p><p className="mt-2 text-xs text-foreground-muted">Suggestion only. Your draft is unchanged until you accept an edit.</p></details>}
    </section>
    <section className="nlp-panel"><h2 className="text-lg font-semibold mb-3">Vocabulary & useful phrases</h2>
      <p className="text-sm">Unique lemmas: {analysis.vocabulary.unique_lemmas} · TTR: {analysis.vocabulary.type_token_ratio.toFixed(2)} · MATTR: {analysis.vocabulary.mattr?.toFixed(2) ?? "Needs 50 words"}</p>
      <p className="text-xs text-foreground-muted mt-2">{analysis.vocabulary.note}</p>
      {analysis.vocabulary.repetitions.length > 0 && <p className="text-sm mt-4">Repeated content words: {analysis.vocabulary.repetitions.map((r) => `${r.word} (${r.count})`).join(", ")}</p>}
      <div className="space-y-3 mt-4">{analysis.vocabulary.suggestions.map((s, i) => <div key={i} className="p-3 rounded-xl bg-background-secondary space-y-2"><p>{s.original} → <strong className="text-emerald-300">{s.suggestion}</strong></p><p className="text-sm text-foreground-muted">{s.reason}</p><SavePhraseButton chunk={{ text: s.suggestion, note: s.reason }} /></div>)}</div>
      <div className="flex flex-wrap gap-3 mt-4">{analysis.vocabulary.chunks.map((c) => <div key={`${c.start}-${c.end}`} className="p-3 rounded-lg border border-border space-y-2"><p className="text-sm">{c.text}</p><SavePhraseButton chunk={{ text: c.text, note: `From: ${analysis.text.slice(0, 500)}` }} /></div>)}</div>
    </section>
    <section className="nlp-panel"><h2 className="text-lg font-semibold mb-3">Relevance & coherence</h2>
      <p>{analysis.semantics.status === "available" ? `Topic relationship: ${analysis.semantics.relevance.replaceAll("_", " ")} · similarity ${analysis.semantics.similarity?.toFixed(2) ?? "not requested"}` : "Semantic relevance is not assessed without the embedding model."}</p>
      {analysis.semantics.coherence !== null && <p className="text-sm mt-2">Adjacent-sentence similarity: {analysis.semantics.coherence.toFixed(2)}</p>}
      {analysis.semantics.matches.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{analysis.semantics.matches.map((m) => <span key={m.target} className={`px-3 py-1 rounded-lg text-sm ${m.matched ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>{m.matched ? "✓" : "○"} {m.target}</span>)}</div>}
      <p className="text-xs text-foreground-muted mt-3">{analysis.semantics.note}</p>
    </section>
    {analysis.shadowing && <section className="nlp-panel"><h2 className="text-lg font-semibold mb-3">Word-level shadowing comparison</h2>
      <p className="text-sm mb-4">WER: {(analysis.shadowing.wer*100).toFixed(1)}% · Lexical agreement: {analysis.shadowing.lexical_accuracy}% · Completion: {analysis.shadowing.completion}%</p>
      <div className="flex flex-wrap gap-2">{analysis.shadowing.alignment.map((w, i) => <span key={i} title={w.operation} className={`px-2 py-1 rounded text-sm ${w.operation === "equal" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{w.reference || "∅"}{w.operation !== "equal" && ` → ${w.recognized || "missing"}`}</span>)}</div>
      <p className="text-sm mt-4">Repeat these words slowly, then in the full sentence: {analysis.shadowing.practice_phrases.join(", ") || "No lexical mismatches detected."}</p>
      <p className="text-xs text-foreground-muted mt-3">{analysis.shadowing.note}</p>
    </section>}
    {analysis.writing && <section className="nlp-panel"><h2 className="text-lg font-semibold mb-3">Writing structure & register</h2><p className="text-sm">{analysis.writing.paragraph_count} paragraphs · {analysis.writing.mean_sentence_words} words per sentence · {analysis.writing.detected_register}</p>{analysis.writing.suggestions.map((s) => <p className="text-sm mt-2" key={s}>{s}</p>)}<p className="text-xs text-foreground-muted mt-3">{analysis.writing.register_note}</p></section>}
    <section className="nlp-panel space-y-3"><h2 className="text-lg font-semibold">What to take into your next practice</h2><p className="text-sm">{analysis.semantics.matches.length ? `You used ${analysis.semantics.matches.filter((m) => m.matched).length} of ${analysis.semantics.matches.length} target phrases exactly.` : `Your response contains ${analysis.vocabulary.word_count} words for review.`}</p><p className="text-sm text-foreground-muted">{analysis.grammar.recommendations[0] || "Try expressing the same idea in a new situation, then compare your phrasing."}</p>{analysis.fluency.filler_count > 0 && <p className="text-sm text-foreground-muted">Review the possible filler words in context. In your next attempt, plan two or three main points and use a comfortable pace.</p>}</section>
    <details className="nlp-panel text-sm"><summary className="cursor-pointer">Measurement details</summary><p className="mt-3 text-foreground-muted">{analysis.fluency.note}</p><p className="mt-3">Pipeline: {analysis.preprocessing.model}:{analysis.model_info.spacy_pipeline_version} · {analysis.version} · {Math.round(analysis.latency_ms)}ms</p>{analysis.fluency.score && <p className="mt-2">Weights: {analysis.fluency.score.components.map((c) => `${c.key.replaceAll("_", " ")} ${Math.round(c.weight*100)}%`).join(", ")}</p>}</details>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="p-4 rounded-xl bg-background-card border border-border"><p className="text-xl font-semibold text-accent">{value}</p><p className="text-xs text-foreground-muted mt-1">{label}</p></div>;
}
