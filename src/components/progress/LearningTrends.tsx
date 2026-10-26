"use client";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LearningSummary } from "@/lib/learning/analytics";

const metrics = { wpm: "Recognized words per session minute", grammar_rate: "Detected grammar issues per 100 words", diversity: "Vocabulary diversity (50-word MATTR)", fillers_per_100: "Possible fillers per 100 words", lexical_accuracy: "Shadowing lexical agreement (%)", semantic_similarity: "Semantic similarity (estimate)", score: "Internal practice score" };
export default function LearningTrends({ trends }: { trends: LearningSummary["trends"] }) {
  const [metric,setMetric] = useState<keyof typeof metrics>("grammar_rate");
  const [mode,setMode] = useState("all");
  const [detector,setDetector] = useState("all");
  const detectors = [...new Set(trends.map((t) => t.detector))];
  const filtered = trends.filter((t) => (mode === "all" || t.mode === mode) && (detector === "all" || t.detector === detector) && t[metric] !== null);
  return <section className="nlp-panel space-y-4"><h2 className="text-lg font-semibold">Learning signals across completed sessions</h2><div className="flex gap-3 flex-wrap"><select className="nlp-input w-auto max-w-full" aria-label="Learning metric" value={metric} onChange={(e) => setMetric(e.target.value as keyof typeof metrics)}>{Object.entries(metrics).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><select className="nlp-input w-auto" aria-label="Learning activity" value={mode} onChange={(e) => setMode(e.target.value)}><option value="all">All activities</option>{["cycle","speak","write","shadow","read"].map((m) => <option key={m}>{m}</option>)}</select>{detectors.length > 1 && <select className="nlp-input w-auto max-w-full" aria-label="Detector configuration" value={detector} onChange={(e) => setDetector(e.target.value)}><option value="all">All detector configurations</option>{detectors.map((d) => <option key={d}>{d}</option>)}</select>}</div>
    {filtered.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={filtered}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="date" stroke="var(--foreground-muted)" fontSize={11} /><YAxis stroke="var(--foreground-muted)" fontSize={11} /><Tooltip contentStyle={{ background:"var(--background-card)",borderColor:"var(--border)",color:"white" }} /><Line dataKey={metric} name={metrics[metric]} stroke="var(--accent)" connectNulls={false} /></LineChart></ResponsiveContainer></div> : <p className="text-sm text-foreground-muted">No comparable measurements yet. Complete an analyzed exercise to begin.</p>}
    <p className="text-xs text-foreground-muted">Compare the same exercise and detector configuration over similar response lengths. Grammar measures detected issues, not all errors. Short responses have no MATTR. Semantic similarity does not measure answer correctness. No CEFR certification or acoustic pronunciation score is inferred.</p>
  </section>;
}
