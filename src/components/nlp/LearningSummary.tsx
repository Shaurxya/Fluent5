"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LearningSummary } from "@/lib/learning/analytics";
import { requestJSON } from "@/lib/nlp/client";

export function useLearningSummary() {
  const [data,setData] = useState<LearningSummary | null>(null);
  const [error,setError] = useState("");
  const load = useCallback(async () => {
    try { const next = await requestJSON<LearningSummary>("/api/learning/summary"); setData(next); setError(""); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not load your learning history."); }
  },[]);
  useEffect(() => {
    const controller = new AbortController();
    requestJSON<LearningSummary>("/api/learning/summary", {signal:controller.signal})
      .then((next) => {if (!controller.signal.aborted) setData(next);})
      .catch((e) => {if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load history.");});
    return () => controller.abort();
  },[]);
  return {data,error,reload:load};
}

export function PersonalizedLearningPlan({ data }: { data: LearningSummary }) {
  return <section className="nlp-panel space-y-4"><h2 className="text-lg font-semibold">Your next practice</h2>{data.recommendations.length ? data.recommendations.map((r) => <div key={r.category} className="border-t border-border pt-3"><Link href={r.href} className="text-accent font-medium">{r.title} →</Link><p className="text-sm text-foreground-muted mt-1">{r.reason}</p></div>) : <p className="text-sm text-foreground-muted">Complete a few analyzed sessions to reveal recurring patterns. Recommendations require evidence from at least two sessions.</p>}</section>;
}

export function SummaryError({ error,retry }: { error:string; retry:()=>void }) {
  return <div role="alert" className="nlp-panel space-y-3"><p className="text-amber-200">{error}</p><button className="nlp-button" onClick={retry}>Retry</button></div>;
}
