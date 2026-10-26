import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "request_failed") { super(message); }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 100000) { await reader.cancel(); throw new ApiError(413, "Input exceeds 100KB."); }
    chunks.push(value);
  }
  let input: unknown;
  try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "Send valid JSON."); }
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(422, "Invalid input. Check text length and required fields.", "invalid_input");
  return result.data;
}

export async function authenticated(req?: Request) {
  if (req) {
    const origin = req.headers.get("origin");
    const allowed = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    if (origin && origin !== allowed) throw new ApiError(403, "Request origin is not allowed.");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new ApiError(503, "Supabase is not configured. Follow the setup guide.", "configuration");
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new ApiError(401, "Sign in to continue.", "unauthorized");
  return { supabase, user };
}

export async function quota(supabase: Awaited<ReturnType<typeof createClient>>, resource: "nlp" | "ai" | "tts") {
  const { data, error } = await supabase.rpc("consume_api_quota", { p_resource: resource });
  if (error) throw new ApiError(503, "Usage protection unavailable. Check database migration 003.", "database_unavailable");
  if (!data) throw new ApiError(429, "Daily request limit reached. Limits reset at midnight UTC.", "quota_reached");
}

export function failure(error: unknown) {
  if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message } }, error.status);
  // Avoid logging third-party errors which can contain private learner content.
  console.error("FluentFive request failed", { type: error instanceof Error ? error.name : "unknown" });
  return json({ error: { code: "internal", message: "This request could not be completed. Please retry." } }, 500);
}
