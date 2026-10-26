import type { SupabaseClient } from "@supabase/supabase-js";

// Use the authenticated user's client: no service role or RLS bypass is needed.
export async function checkIdempotency(supabase: SupabaseClient, userId: string, mode: string, input: Record<string, unknown>) {
  const { data, error } = await supabase.from("ai_analyses").select("output_jsonb")
    .eq("user_id", userId).eq("mode", mode).eq("input_jsonb", JSON.stringify(input))
    .gte("created_at", new Date(Date.now()-120000).toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return error ? null : data?.output_jsonb;
}

export async function logAnalysis(supabase: SupabaseClient, userId: string, sessionId: string | undefined, mode: string,
  input: Record<string, unknown>, output: unknown, model: string) {
  const { error } = await supabase.from("ai_analyses").insert({ user_id: userId, session_id: sessionId || null, mode, input_jsonb: input, output_jsonb: output, model });
  if (error) console.error("AI history could not be stored", { code: error.code });
}
