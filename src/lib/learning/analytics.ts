import { analysisSchema } from "@/lib/nlp/contracts";

export interface LearningAttempt { id: string; activity_key: string; created_at: string; xp_awarded: number; analysis_id: string | null; payload?: Record<string, unknown> }
export interface LearningRecommendation { category: string; title: string; reason: string; href: string; sessions: number }
export interface LearningSummary {
  profile: { display_name: string | null; xp: number; streak: number; longest_streak: number; email: string };
  today_activities: string[]; weekly_active_days: number; saved_chunks: number; due_chunks: number;
  reviews: { count: number; recalled: number; recall_rate: number | null };
  history: LearningAttempt[];
  chart: { date: string; activities: number; xp: number }[];
  trends: { date: string; mode: string; wpm: number | null; grammar_rate: number; diversity: number | null; fillers_per_100: number; score: number | null; lexical_accuracy: number | null; semantic_similarity: number | null; detector: string }[];
  recommendations: LearningRecommendation[];
  recurring_errors: {category:string;sessions:number}[];
  phrase_usage: {phrase:string;used:number;attempts:number}[];
  test_results: { id: string; mode: string; pct: number; taken_on: string }[];
}

export function currentStreak(profile: { streak: number; last_active: string | null }, today: string) {
  if (!profile.last_active) return 0;
  const gap = (Date.parse(today) - Date.parse(profile.last_active))/86400000;
  return gap >= 0 && gap <= 1 ? profile.streak : 0;
}

export function learningSignals(records: { created_at: string; result: unknown }[]) {
  const categories = new Map<string, number>();
  const trends: LearningSummary["trends"] = [];
  let fillerSessions = 0;
  let repeatedSessions = 0;
  let relevanceSessions = 0;
  const usage = new Map<string,{phrase:string;used:number;attempts:number}>();
  for (const record of records) {
    const parsed = analysisSchema.safeParse(record.result);
    if (!parsed.success) continue;
    const a = parsed.data;
    for (const category of new Set(a.grammar.errors.map((e) => e.category))) categories.set(category, (categories.get(category) || 0)+1);
    if (a.fluency.filler_count/Math.max(1,a.vocabulary.word_count)>0.05) fillerSessions++;
    if (a.vocabulary.repetitions.length > 0) repeatedSessions++;
    if (a.semantics.status === "available" && a.semantics.relevance === "possibly_off_topic") relevanceSessions++;
    for (const match of a.semantics.matches) {
      const key=match.target.toLocaleLowerCase("en");
      const item=usage.get(key) || {phrase:match.target,used:0,attempts:0};
      item.attempts++;if(match.matched)item.used++;usage.set(key,item);
    }
    trends.push({ date: record.created_at.slice(0,10), mode: a.mode, wpm: a.fluency.words_per_minute,
      grammar_rate: a.fluency.grammar_errors_per_100_words, diversity: a.vocabulary.mattr,
      fillers_per_100: Math.round(a.fluency.filler_count/Math.max(1,a.vocabulary.word_count)*1000)/10,
      score: a.fluency.score?.value ?? null, lexical_accuracy: a.shadowing?.lexical_accuracy ?? null,
      semantic_similarity: a.semantics.similarity, detector: `${a.grammar.detector_version}/${a.preprocessing.model}:${a.model_info.spacy_pipeline_version}/${a.version}` });
  }
  const recommendations: LearningRecommendation[] = [];
  const rules: Record<string, [string, string]> = {
    tense: ["Practice past-time stories", "Use yesterday, last week and last year while telling a short personal story."],
    subject_verb_agreement: ["Practice matching subjects and verbs", "Describe what you do and what a friend does each day."],
    article: ["Review articles in context", "Write descriptions of everyday objects using a, an and the."],
    preposition: ["Review phrase combinations", "Save and review complete expressions with their prepositions."],
    spelling: ["Rewrite and check spelling", "Review the flagged words in your own sentences."],
  };
  for (const [category, count] of categories) {
    if (count < 2) continue;
    const rule = rules[category] || ["Review recurring grammar suggestions", "Compare the corrections across your recent practice sessions."];
    recommendations.push({ category, title: rule[0], reason: `${count} recent completed analyses flagged this category. ${rule[1]}`, href: category === "tense" ? "/app/speak" : "/app/write", sessions: count });
  }
  for (const [count, category, title, reason, href] of [
    [fillerSessions,"fillers","Practice a short, planned response","Possible discourse markers appeared frequently. Some uses may be meaningful; review your transcripts.","/app/cycle"],
    [repeatedSessions,"repetition","Explore more specific phrasing","Repeated content words appeared in multiple responses. Variation is optional; prioritize meaning.","/app/read"],
    [relevanceSessions,"relevance","Practice answering the main question","Embedding similarity suggested topic drift more than once. Check the prompts before drawing conclusions.","/app/read"],
  ] as const) if (count >= 2) recommendations.push({ category, title, reason: `${count} recent completed analyses. ${reason}`, href, sessions: count });
  return { trends: trends.reverse(), recommendations: recommendations.sort((a,b) => b.sessions-a.sessions).slice(0,5),
    recurring_errors:[...categories].map(([category,sessions]) => ({category,sessions})).sort((a,b) => b.sessions-a.sessions),
    phrase_usage:[...usage.values()].sort((a,b) => b.attempts-a.attempts).slice(0,20) };
}
