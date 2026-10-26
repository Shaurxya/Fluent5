import { z } from "zod";
import { ApiError, authenticated, body, failure, json, quota } from "@/lib/api/server";

const matchesSchema = z.object({ matches: z.array(z.object({ offset: z.number().int().nonnegative(), length: z.number().int().nonnegative(), message: z.string(), replacements: z.array(z.object({ value: z.string() })), rule: z.object({ id: z.string(), category: z.object({ id: z.string() }) }) })) });
export async function POST(req: Request) {
  try {
    const { supabase } = await authenticated(req);
    const { text } = await body(req, z.object({ text: z.string().trim().min(1).max(12000) }).strict());
    await quota(supabase, "nlp");
    const base = process.env.LANGUAGETOOL_URL || "https://api.languagetool.org";
    const response = await fetch(`${base.replace(/\/$/, "")}/v2/check`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ text, language: "en-US" }), signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!response.ok) throw new ApiError(503, "Grammar checker unavailable. Your draft is unchanged.");
    const data = matchesSchema.parse(await response.json());
    return json({ errors: data.matches.map((m, i) => ({ id: `lt-${i}`, start: Array.from(text.slice(0,m.offset)).length, end: Array.from(text.slice(0,m.offset+m.length)).length,
      original: text.slice(m.offset,m.offset+m.length), category: m.rule.category.id.toLowerCase(), replacements: m.replacements.slice(0,3).map((r) => r.value), explanation: m.message, source: "LanguageTool" })) });
  } catch (error) { return failure(error); }
}
