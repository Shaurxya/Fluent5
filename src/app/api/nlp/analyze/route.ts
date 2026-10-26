import { createHash } from "node:crypto";
import { analysisInputSchema, analysisSchema } from "@/lib/nlp/contracts";
import { ApiError, authenticated, body, failure, json, quota } from "@/lib/api/server";
import { assertStorage } from "@/lib/learning/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticated(req);
    const input = await body(req, analysisInputSchema);
    const url = process.env.NLP_SERVICE_URL;
    const key = process.env.NLP_SERVICE_API_KEY;
    if (!url || !key) throw new ApiError(503, "The NLP service is not configured. Your text has been kept; try again after setup.", "nlp_unavailable");
    const requestKey = createHash("sha256").update(JSON.stringify({ version: "nlp-v1", ...input })).digest("hex");
    const { data: cached, error: readError } = await supabase.from("nlp_analyses").select("id,result").eq("user_id", user.id).eq("request_key", requestKey).maybeSingle();
    assertStorage("nlp_analyses",readError);
    if (cached) return json({ analysis_id: cached.id, analysis: analysisSchema.parse(cached.result), cached: true });
    await quota(supabase, "nlp");
    const serviceInput = { mode: input.mode, text: input.text, prompt: input.prompt, reference: input.reference, expected_answer: input.expected_answer, targets: input.targets, duration_seconds: input.duration_seconds, target_register: input.target_register };
    let response: Response;
    try {
      response = await fetch(`${url.replace(/\/$/, "")}/nlp/analyze`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(serviceInput), signal: AbortSignal.timeout(45000), cache: "no-store" });
    } catch { throw new ApiError(503, "NLP service is unreachable or timed out. Your text is still available; retry shortly.", "nlp_unavailable"); }
    if (!response.ok) throw new ApiError(response.status === 422 ? 422 : response.status === 429 ? 429 : 503,
      response.status === 422 ? "This text cannot be analyzed. Shadowing supports up to 500 words per text." : "NLP service is busy or unavailable. Try again shortly.");
    const parsed = analysisSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.text !== input.text) throw new ApiError(502, "The NLP service returned an invalid response.");
    const analysis = parsed.data;
    const { data: saved, error } = await supabase.from("nlp_analyses").insert({ user_id: user.id, request_key: requestKey, mode: input.mode,
      result: analysis, engine_version: analysis.version, scoring_version: analysis.fluency.score?.version || "practice-v1" }).select("id").single();
    if (error?.code === "23505") {
      const { data: existing } = await supabase.from("nlp_analyses").select("id,result").eq("user_id", user.id).eq("request_key", requestKey).single();
      if (existing) return json({ analysis_id: existing.id, analysis: analysisSchema.parse(existing.result), cached: true });
    }
    if (error || !saved) throw new ApiError(503, "Analysis could not be saved. Retry to store your results.", "save_failed");
    return json({ analysis_id: saved.id, analysis, cached: false });
  } catch (error) { return failure(error); }
}
