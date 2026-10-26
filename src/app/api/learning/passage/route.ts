import { z } from "zod";
import { ApiError, authenticated, failure, json } from "@/lib/api/server";

const summary = z.object({ title: z.string(), extract: z.string().min(50).max(12000) });
export async function GET(req: Request) {
  try {
    const { supabase } = await authenticated(req);
    const topics = ["Coffee", "Gardening", "Bicycle", "Photography", "Bread", "Music", "Hiking", "Origami"];
    const topic = topics[Math.floor(Math.random()*topics.length)];
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "FluentFive/1.0 (English learning application)" }, cache: "no-store" });
      if (response.ok) {
        const data = summary.parse(await response.json());
        return json({ title: data.title, text: data.extract, source: `https://en.wikipedia.org/wiki/${topic}`, attribution: "Wikipedia contributors, CC BY-SA. Follow source for authors and revision history." });
      }
    } catch { /* Use existing seeded passages when Wikipedia is unavailable. */ }
    const { data, error } = await supabase.from("passages").select("id,title,body").limit(50);
    if (error || !data?.length) throw new ApiError(503, "No passage is available. Retry, or load supabase/seed.sql.");
    const passage = data[Math.floor(Math.random()*data.length)];
    return json({ title: passage.title || "Practice reading", text: passage.body, source: "FluentFive passage library", attribution: "FluentFive seeded learning content" });
  } catch (error) { return failure(error); }
}
