import { z } from "zod";
import { ApiError, authenticated, body, failure, json } from "@/lib/api/server";

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticated(req);
    const input = await body(req, z.object({ id: z.uuid(), prompt: z.string().max(2000), draft_v1: z.string().trim().min(1).max(12000) }).strict());
    const { error } = await supabase.from("writings").insert({ ...input, user_id: user.id, word_count: input.draft_v1.split(/\s+/).length });
    if (error && error.code !== "23505") throw new ApiError(503, "Draft was not saved. Please retry.");
    if (error?.code === "23505") {
      const { data } = await supabase.from("writings").select("id").eq("id", input.id).eq("user_id", user.id).maybeSingle();
      if (!data) throw new ApiError(409, "Draft identity conflict. Start a new draft.");
    }
    return json({ id: input.id });
  } catch (error) { return failure(error); }
}
