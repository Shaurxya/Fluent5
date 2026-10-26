import { z } from "zod";
import { ApiError, authenticated, body, failure, json } from "@/lib/api/server";

export async function POST(req: Request) {
  try {
    const { supabase } = await authenticated(req);
    const input = await body(req, z.object({ attempt_id: z.uuid(), chunk_id: z.uuid(), quality: z.union([z.literal(0), z.literal(2), z.literal(4), z.literal(5)]) }).strict());
    const { data, error } = await supabase.rpc("review_learning_chunk", { p_attempt_id: input.attempt_id, p_chunk_id: input.chunk_id, p_quality: input.quality });
    if (error) throw new ApiError(409, "Review was not saved. The card may already have been rescheduled; refresh or retry.", "save_failed");
    return json(data);
  } catch (error) { return failure(error); }
}
