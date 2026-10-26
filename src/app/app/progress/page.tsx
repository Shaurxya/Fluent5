"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLearningSummary, PersonalizedLearningPlan, SummaryError } from "@/components/nlp/LearningSummary";
const ProgressChart = dynamic(() => import("@/components/progress/ProgressChart"), {ssr:false});
const LearningTrends = dynamic(() => import("@/components/progress/LearningTrends"), {ssr:false});
export default function ProgressPage() {
  const {data,error,reload} = useLearningSummary();
  const [range,setRange] = useState(30);
  return <div className="space-y-6"><header><h1 className="text-2xl font-bold">Your learning progress</h1><p className="text-foreground-muted mt-2">Actual practice history, with measured and estimated signals kept distinct.</p></header>
    {error && <SummaryError error={error} retry={reload} />}
    {!data && !error && <p role="status">Loading learning history…</p>}
    {data && <><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[["Total XP",data.profile.xp],["Current streak",`${data.profile.streak} days`],["Best streak",`${data.profile.longest_streak} days`],["Active days this week",`${data.weekly_active_days}/7`]].map(([label,value]) => <div key={label} className="nlp-panel"><p className="text-2xl text-accent font-semibold">{value}</p><p className="text-sm text-foreground-muted mt-2">{label}</p></div>)}</div>
    <div className="flex justify-between items-center"><h2 className="text-lg font-semibold">Daily activity & earned XP</h2><select className="nlp-input w-auto" aria-label="Progress period" value={range} onChange={(e) => setRange(Number(e.target.value))}><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></div><ProgressChart data={data.chart.slice(-range)} />
    <LearningTrends trends={data.trends} />
    <p className="text-xs text-foreground-muted">Earlier daily activity is preserved. Historical daily XP was not consistently recorded by older versions; the XP chart uses recorded daily values, with reliable transaction-based logging after the NLP migration. It does not reconstruct unrecorded rewards.</p>
    <section className="nlp-panel space-y-3"><h2 className="text-lg font-semibold">Vocabulary retention</h2><p>{data.saved_chunks} saved phrases · {data.due_chunks} due for review</p><p className="text-sm text-foreground-muted">{data.reviews.count ? `${data.reviews.recalled}/${data.reviews.count} reviews rated Good or Easy (${Math.round((data.reviews.recall_rate || 0)*100)}%) in the last 90 days.` : "No flashcard reviews yet."} Recall ratings are self-reported, not externally validated retention measurements.</p><Link className="text-accent" href="/app/review">Review due phrases →</Link></section>
    <PersonalizedLearningPlan data={data} />
    <section className="nlp-panel space-y-3"><h2 className="text-lg font-semibold">Recurring error categories</h2>{data.recurring_errors.length ? data.recurring_errors.map((e) => <p className="text-sm" key={e.category}>{e.category.replaceAll("_"," ")}: flagged in {e.sessions} completed analyses</p>) : <p className="text-sm text-foreground-muted">No patterns recorded yet.</p>}</section>
    <section className="nlp-panel space-y-3"><h2 className="text-lg font-semibold">Target phrase usage</h2>{data.phrase_usage.length ? data.phrase_usage.map((p) => <p className="text-sm" key={p.phrase}>{p.phrase}: exact use in {p.used}/{p.attempts} targeted attempts</p>) : <p className="text-sm text-foreground-muted">Target phrase usage appears after completing a fluency cycle.</p>}</section>
    <section className="nlp-panel space-y-3"><h2 className="text-lg font-semibold">Quiz history</h2>{data.test_results.length ? data.test_results.map((t) => <p key={t.id} className="text-sm">{t.taken_on} · {t.mode} · {t.pct}% correct</p>) : <p className="text-foreground-muted">No quizzes completed yet.</p>}</section>
    <Link href="/app/activities" className="text-accent">View practice sessions & feedback →</Link></>}
  </div>;
}
