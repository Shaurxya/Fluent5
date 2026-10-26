import { z } from "zod";
import { chunksSchema } from "@/lib/nlp/contracts";
import { ApiError, authenticated, body, failure, json } from "@/lib/api/server";

export async function POST(req: Request) {
  try {
    const { supabase } = await authenticated(req);
    const input = await body(req, z.object({ chunks: chunksSchema }).strict());
    const { data, error } = await supabase.rpc("save_learning_chunks", { p_chunks: input.chunks });
    if (error) throw new ApiError(503, "Phrases could not be saved. Your selection is kept; retry shortly.", "save_failed");
    return json({ saved: data });
  } catch (error) { return failure(error); }
}
