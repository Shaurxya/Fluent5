import { z } from "zod";
import { ApiError, authenticated, body, failure, json } from "@/lib/api/server";

export async function POST(req:Request) {
  try {
    const {supabase} = await authenticated(req);
    const input = await body(req,z.object({attempt_id:z.uuid(),mode:z.enum(["grammar","chunks","mixed"]),score:z.number().int().min(0),total:z.number().int().min(1).max(20)}).strict().refine((v) => v.score<=v.total));
    const {data,error} = await supabase.rpc("record_quiz_attempt",{p_attempt_id:input.attempt_id,p_mode:input.mode,p_score:input.score,p_total:input.total});
    if(error) throw new ApiError(503,"Quiz was not saved. Retry to keep your result.");
    return json(data);
  }catch(error){return failure(error);}
}
