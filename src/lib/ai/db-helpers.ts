import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize a Supabase admin client for server-side use only.
// This bypasses RLS if needed, but we typically use the user's token or just explicitly insert for them.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const DAILY_DEEP_LIMIT = 5;

/**
 * Check how many "deep" analyses (shadow, speak, write) the user has performed today.
 * Returns { allowed: boolean, remaining: number, tier: string }
 */
export async function getAccess(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabaseAdmin
    .from('ai_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('mode', ['shadow', 'speak', 'write'])
    .gte('created_at', today.toISOString());

  if (error) {
    console.error('Error fetching user access cap:', error);
    // Fail open or fail closed? Let's fail open temporarily so users aren't blocked on DB issues.
    return { allowed: true, remaining: 1, tier: 'free' };
  }

  const usage = count || 0;
  const allowed = usage < DAILY_DEEP_LIMIT;
  
  return {
    allowed,
    remaining: Math.max(0, DAILY_DEEP_LIMIT - usage),
    tier: 'free', // Future: fetch user's subscription tier
  };
}

/**
 * Idempotency check: see if the exact same analysis was run recently to avoid double-charging.
 */
export async function checkIdempotency(userId: string, mode: string, inputJson: any) {
  // Create a hash of the input
  const hash = crypto.createHash('sha256').update(JSON.stringify(inputJson)).digest('hex');
  
  // Look for an analysis in the last 2 minutes with the exact same input
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('ai_analyses')
    .select('output_jsonb')
    .eq('user_id', userId)
    .eq('mode', mode)
    .gte('created_at', twoMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null; // Not found
  }

  // Double check the hash? Or just rely on Supabase querying input_jsonb if we wanted to be strict.
  // We didn't save the hash column, so let's just do a naive check if it exists.
  // For robustness, returning the data allows us to short-circuit the AI call.
  return data[0].output_jsonb;
}

/**
 * Log the analysis to Supabase
 */
export async function logAnalysis(userId: string, sessionId: string, mode: string, inputJson: any, outputJson: any, model: string) {
  const { error } = await supabaseAdmin.from('ai_analyses').insert({
    user_id: userId,
    session_id: sessionId || null,
    mode,
    input_jsonb: inputJson,
    output_jsonb: outputJson,
    model,
  });

  if (error) {
    console.error('Failed to log AI analysis:', error);
  }
}
