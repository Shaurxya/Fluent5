import { z } from "zod";
import { ApiError, authenticated, body, failure, quota } from "@/lib/api/server";

export async function POST(req: Request) {
  try {
    const { supabase } = await authenticated(req);
    const { text, voiceId } = await body(req, z.object({ text: z.string().trim().min(1).max(2000), voiceId: z.string().regex(/^[a-zA-Z0-9]{10,40}$/).default("XrExE9yKIg1WjnnlVkGX") }).strict());
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new ApiError(503, "ElevenLabs voice is not configured. You can still record and compare recognized words.");
    await quota(supabase, "tts");
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST", headers: { Accept: "audio/mpeg", "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!response.ok) throw new ApiError(503, "Model audio is temporarily unavailable. Please retry.");
    return new Response(await response.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
