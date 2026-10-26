import { completeSchema } from "@/lib/nlp/contracts";
import { ApiError, authenticated, body, failure, json } from "@/lib/api/server";

export async function POST(req: Request) {
  try {
    const { supabase } = await authenticated(req);
    const input = await body(req, completeSchema);
    const { data, error } = await supabase.rpc("complete_practice", { p_attempt_id: input.attempt_id, p_activity: input.activity,
      p_analysis_id: input.analysis_id, p_payload: input.payload, p_chunks: input.chunks });
    if (error) throw new ApiError(503, "Session was not saved. Retry, or check database migration 003.", "save_failed");
    return json(data);
  } catch (error) { return failure(error); }
}
