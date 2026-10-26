import { z } from "zod";
import { ApiError, authenticated, body, failure, json } from "@/lib/api/server";

export async function DELETE(req: Request) {
  try {
    const {supabase} = await authenticated(req);
    await body(req,z.object({confirm:z.literal("DELETE_MY_ANALYSES")}).strict());
    const {error} = await supabase.rpc("delete_own_analyses");
    if (error) throw new ApiError(503,"Analysis history was not deleted. Please retry.");
    return json({deleted:true});
  } catch(error) {return failure(error);}
}
