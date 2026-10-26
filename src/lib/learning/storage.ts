import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/server";
import type { Profile } from "@/lib/supabase/types";

type StorageResource = "profiles" | "sessions" | "practice_sessions" | "daily_stats" | "chunks" | "flashcard_reviews" | "test_results" | "nlp_analyses";
type StorageError = { code?: string } | null;
const nlpTables = new Set<StorageResource>(["practice_sessions", "flashcard_reviews", "nlp_analyses"]);
const profileColumns = "display_name,xp,streak,longest_streak,last_active";
export type SummaryProfile = Pick<Profile, "display_name" | "xp" | "streak" | "longest_streak" | "last_active">;

/** Classify errors without disclosing query details, tokens or learner content. */
export function assertStorage(resource: StorageResource, error: StorageError): void {
  if (!error) return;
  const code = error.code && /^[A-Z0-9]{4,12}$/.test(error.code) ? error.code : "unavailable";
  console.error("FluentFive database query failed", { resource, code });
  if (["PGRST205", "42P01"].includes(code)) {
    const migration = nlpTables.has(resource) ? "003_nlp_learning.sql" : "001_initial_schema.sql";
    throw new ApiError(503, `Database cannot find "${resource}". Check that ${migration} completed in the Supabase project connected to Vercel, then reload the API schema cache.`, "database_missing_table");
  }
  if (code === "42501") {
    throw new ApiError(503, `Database permission denied for "${resource}". Apply 004_learning_storage_access.sql; keep Row Level Security enabled.`, "database_permissions");
  }
  if (["PGRST204", "42703"].includes(code)) {
    throw new ApiError(503, `Database columns for "${resource}" do not match this app. Check the migration results in Supabase.`, "database_schema_mismatch");
  }
  throw new ApiError(503, `Could not read "${resource}" from Supabase (${code}). Check the database connection and project configuration.`, "database_unavailable");
}

/** Accounts created before the signup trigger may have no profile. Insert only this user. */
export async function ensureOwnProfile(supabase: SupabaseClient, user: User): Promise<SummaryProfile> {
  const name = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim().slice(0,80) : "";
  const { data, error } = await supabase.from("profiles").insert({ id: user.id, display_name: name || "Learner" }).select(profileColumns).single();
  if (error?.code === "23505") {
    // Another request may have created the same profile concurrently. Never upsert rewards.
    const existing = await supabase.from("profiles").select(profileColumns).eq("id",user.id).maybeSingle();
    assertStorage("profiles",existing.error);
    if (existing.data) return existing.data as SummaryProfile;
  } else {
    assertStorage("profiles",error);
    if (data) return data as SummaryProfile;
  }
  throw new ApiError(503,"Your account profile could not be loaded. Sign in again and retry.","profile_unavailable");
}
