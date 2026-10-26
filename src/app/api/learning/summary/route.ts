import { authenticated, failure, json } from "@/lib/api/server";
import { currentStreak, learningSignals, type LearningSummary, type LearningAttempt } from "@/lib/learning/analytics";
import { assertStorage, ensureOwnProfile } from "@/lib/learning/storage";

export async function GET(req: Request) {
  try {
    const { supabase, user } = await authenticated(req);
    const today = new Date().toISOString().slice(0,10);
    const start = new Date(Date.now()-89*86400000).toISOString().slice(0,10);
    const [profile, sessions, history, stats, chunks, due, reviews, tests] = await Promise.all([
      supabase.from("profiles").select("display_name,xp,streak,longest_streak,last_active").eq("id",user.id).maybeSingle(),
      supabase.from("sessions").select("activity_key,done_on").eq("user_id",user.id).gte("done_on",start),
      supabase.from("practice_sessions").select("id,activity_key,created_at,xp_awarded,analysis_id").eq("user_id",user.id).order("created_at",{ascending:false}).limit(250),
      supabase.from("daily_stats").select("day,xp").eq("user_id",user.id).gte("day",start),
      supabase.from("chunks").select("id",{count:"exact",head:true}).eq("user_id",user.id),
      supabase.from("chunks").select("id",{count:"exact",head:true}).eq("user_id",user.id).lte("due_date",today),
      supabase.from("flashcard_reviews").select("grade").eq("user_id",user.id).gte("created_at",start),
      supabase.from("test_results").select("id,mode,pct,taken_on").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30),
    ]);
    assertStorage("profiles",profile.error);
    assertStorage("sessions",sessions.error);
    assertStorage("practice_sessions",history.error);
    assertStorage("daily_stats",stats.error);
    assertStorage("chunks",chunks.error);
    assertStorage("chunks",due.error);
    assertStorage("flashcard_reviews",reviews.error);
    assertStorage("test_results",tests.error);
    const learnerProfile = profile.data || await ensureOwnProfile(supabase,user);
    const attempts = (history.data || []) as LearningAttempt[];
    const ids = [...new Set(attempts.map((s) => s.analysis_id).filter((id): id is string => !!id))];
    const analyses = ids.length ? await supabase.from("nlp_analyses").select("id,created_at,result").eq("user_id",user.id).in("id",ids.slice(0,100)).order("created_at",{ascending:false}) : { data: [], error: null };
    assertStorage("nlp_analyses",analyses.error);
    const signals = learningSignals(analyses.data || []);
    const daily = sessions.data || [];
    const weeklyStart = new Date(Date.now()-6*86400000).toISOString().slice(0,10);
    const chart = Array.from({length:90},(_,i) => {
      const day = new Date(Date.now()-(89-i)*86400000).toISOString().slice(0,10);
      return { date: day, activities: daily.filter((s) => s.done_on === day).length, xp: stats.data?.find((s) => s.day === day)?.xp || 0 };
    });
    const recalled = reviews.data?.filter((r) => r.grade >= 3).length || 0;
    const reviewCount = reviews.data?.length || 0;
    const data: LearningSummary = {
      profile: { display_name: learnerProfile.display_name, xp: learnerProfile.xp || 0, streak: currentStreak(learnerProfile,today), longest_streak: learnerProfile.longest_streak || 0, email: user.email || "" },
      today_activities: daily.filter((s) => s.done_on === today).map((s) => s.activity_key), weekly_active_days: new Set([...daily.filter((s) => s.done_on >= weeklyStart).map((s) => s.done_on),...(tests.data || []).filter((t) => t.taken_on >= weeklyStart).map((t) => t.taken_on)]).size,
      saved_chunks: chunks.count || 0, due_chunks: due.count || 0, reviews: { count: reviewCount, recalled, recall_rate: reviewCount ? recalled/reviewCount : null },
      history: attempts, chart, ...signals, test_results: tests.data || [],
    };
    return json(data);
  } catch (error) { return failure(error); }
}
