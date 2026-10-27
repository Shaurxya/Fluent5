import { analysisEnvelopeSchema, type AnalysisEnvelope, type AnalysisInput, type LearningChunk } from "./contracts";

export class ApiRequestError extends Error {
  constructor(message:string,public status:number,public code?:string) {super(message);this.name="ApiRequestError";}
}

export async function requestJSON<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } }); }
  catch { throw new Error("Connection lost. Your text is still here; try again."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiRequestError(typeof data?.error === "string" ? data.error : data?.error?.message || "Request failed. Please retry.",response.status,typeof data?.error?.code === "string" ? data.error.code : undefined);
  return data as T;
}

export async function analyzeText(input: AnalysisInput, signal?: AbortSignal): Promise<AnalysisEnvelope> {
  const data = await requestJSON("/api/nlp/analyze", { method: "POST", body: JSON.stringify(input), signal });
  const parsed = analysisEnvelopeSchema.safeParse(data);
  if (!parsed.success) throw new Error("Analysis returned an incompatible response. Please retry.");
  return parsed.data;
}

export function saveChunks(chunks: LearningChunk[]) {
  return requestJSON<{ saved: number }>("/api/learning/chunks", { method: "POST", body: JSON.stringify({ chunks }) });
}

export function completePractice(input: { attempt_id: string; activity: "speak" | "read" | "write" | "shadow" | "review"; analysis_id?: string | null; payload?: Record<string, unknown>; chunks?: LearningChunk[] }) {
  return requestJSON<{ id: string; xp_awarded: number; already_saved: boolean; chunks_saved: number }>("/api/learning/complete", { method: "POST", body: JSON.stringify(input) });
}

// Service offsets are Unicode code points; JavaScript string offsets are UTF-16.
export function replaceSpan(text: string, start: number, end: number, replacement: string) {
  const chars = Array.from(text);
  return chars.slice(0, start).join("") + replacement + chars.slice(end).join("");
}
