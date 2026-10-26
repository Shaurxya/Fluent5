import { z } from "zod";
import { ApiError, authenticated, failure, json } from "@/lib/api/server";

export async function GET(req: Request) {
  try {
    const { supabase,user } = await authenticated(req);
    const id = z.uuid().safeParse(new URL(req.url).searchParams.get("id"));
    if (!id.success) throw new ApiError(422,"Invalid session identity.");
    const {data,error} = await supabase.from("practice_sessions").select("*").eq("id",id.data).eq("user_id",user.id).maybeSingle();
    if (error) throw new ApiError(503,"Session could not be loaded.");
    if (!data) throw new ApiError(404,"Session not found.");
    const analysis = data.analysis_id ? await supabase.from("nlp_analyses").select("result").eq("id",data.analysis_id).eq("user_id",user.id).maybeSingle() : {data:null,error:null};
    if (analysis.error) throw new ApiError(503,"Analysis could not be loaded.");
    return json({ session: data, analysis: analysis.data?.result || null });
  } catch (error) { return failure(error); }
}
