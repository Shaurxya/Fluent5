"use client";
import { useState } from "react";
import Link from "next/link";
import { useLearningSummary, SummaryError } from "@/components/nlp/LearningSummary";
import { AnalysisResults } from "@/components/nlp/AnalysisResults";
import { requestJSON } from "@/lib/nlp/client";
import { analysisSchema, type Analysis } from "@/lib/nlp/contracts";

export default function ActivitiesPage() {
  const {data,error,reload} = useLearningSummary();
  const [selected,setSelected] = useState<string | null>(null);
  const [analysis,setAnalysis] = useState<Analysis | null>(null);
  const [detail,setDetail] = useState("");
  async function open(id:string) {
    setSelected(id); setAnalysis(null); setDetail("Loading saved feedback…");
    try {
      const response = await requestJSON<{ analysis:unknown }>(`/api/learning/history?id=${id}`);
      if (response.analysis) { setAnalysis(analysisSchema.parse(response.analysis)); setDetail(""); }
      else setDetail("This session has no saved NLP analysis. Its completion record remains in your history.");
    } catch(e) { setDetail(e instanceof Error ? e.message : "Could not load feedback."); }
  }
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Activities & learning history</h1><nav className="flex flex-wrap gap-3" aria-label="Practice exercises">{[["cycle","Fluency cycle"],["speak","Speaking"],["shadow","Shadowing"],["read","Active reading"],["write","Writing"],["review","Review"]].map(([path,label]) => <Link key={path} className="nlp-button" href={`/app/${path}`}>{label}</Link>)}</nav>
    {error && <SummaryError error={error} retry={reload} />}{!data && !error && <p role="status">Loading sessions…</p>}
    {data && <section className="nlp-panel space-y-3"><h2 className="text-lg font-semibold">Completed practice sessions</h2><p className="text-xs text-foreground-muted">Detailed sessions are recorded after the NLP migration. Earlier daily activity remains in the progress charts.</p>{data.history.length ? data.history.map((s) => <button key={s.id} onClick={() => open(s.id)} className={`flex flex-wrap gap-3 justify-between w-full text-left rounded-xl border p-4 ${selected === s.id ? "border-accent" : "border-border"}`}><span className="capitalize">{s.activity_key}</span><span className="text-sm text-foreground-muted">{new Date(s.created_at).toLocaleString()} · +{s.xp_awarded} XP</span></button>) : <p className="text-foreground-muted">No sessions yet. Start with the fluency cycle.</p>}</section>}
    {detail && <p role="status">{detail}</p>}{analysis && <AnalysisResults analysis={analysis} />}
  </div>;
}
