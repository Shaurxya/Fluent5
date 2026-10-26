"use client";
import { useState } from "react";
import type { AnalysisEnvelope } from "@/lib/nlp/contracts";
import { analyzeText } from "@/lib/nlp/client";
import { PhraseMeaning } from "./PhraseMeaning";
import { SavePhraseButton } from "./AnalysisResults";

export function ReadingInsights({ result }: { result: AnalysisEnvelope }) {
  const { analysis } = result;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  async function check(id: string, question: string, expected: string) {
    setBusy(id);
    try {
      const answer = await analyzeText({ attempt_id: crypto.randomUUID(), mode: "semantics", text: answers[id], prompt: question, expected_answer: expected });
      const semantics = answer.analysis.semantics;
      setFeedback((v) => ({ ...v, [id]: semantics.status === "available" ? `Topic relationship: ${semantics.relevance.replaceAll("_", " ")}. Similarity: ${semantics.similarity?.toFixed(2)}. This compares with an extractive answer anchor; a different valid answer may score differently. It does not establish correctness.` : "Semantic model unavailable. Compare your answer with the passage; no score was assigned." }));
    } catch (e) { setFeedback((v) => ({ ...v, [id]: e instanceof Error ? e.message : "Could not check this answer." })); }
    finally { setBusy(null); }
  }
  return <section className="nlp-panel space-y-4"><h2 className="text-lg font-semibold">Reading insights</h2>
    <p className="text-sm">Keywords: {analysis.vocabulary.keywords.join(", ") || "No keywords extracted"}</p>
    {analysis.reading && <><p className="text-sm">Estimated text difficulty: {analysis.reading.difficulty} · Reading ease: {analysis.reading.reading_ease}</p><p className="text-xs text-foreground-muted">{analysis.reading.note}</p></>}
    {analysis.preprocessing.entities.length > 0 && <p className="text-sm">Named entities: {analysis.preprocessing.entities.map((e) => `${e.text} (${e.label})`).join(", ")}</p>}
    <div className="flex flex-wrap gap-3">{analysis.vocabulary.chunks.map((c) => <div className="border border-border rounded-xl p-3 space-y-2" key={`${c.start}-${c.end}`}><p>{c.text}</p><PhraseMeaning phrase={c.text} context={analysis.text} /><SavePhraseButton chunk={{ text: c.text, note: `Passage context: ${analysis.text.slice(0, 500)}` }} /></div>)}</div>
    {analysis.reading?.questions.map((q) => <div key={q.id} className="border-t border-border pt-4 space-y-3"><label htmlFor={q.id} className="block text-sm">{q.question}</label><textarea id={q.id} className="nlp-input min-h-20" value={answers[q.id] || ""} maxLength={2000} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} /><button type="button" className="nlp-button" disabled={!!busy || !answers[q.id]?.trim()} onClick={() => check(q.id, q.question, q.expected_answer)}>{busy === q.id ? "Checking…" : "Check answer relevance"}</button>{feedback[q.id] && <p role="status" className="text-sm text-foreground-muted">{feedback[q.id]}</p>}</div>)}
  </section>;
}
