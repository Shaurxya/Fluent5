"use client";
import { useState } from "react";
import { ChunkingSchema } from "@/lib/ai/schemas";
import { requestJSON } from "@/lib/nlp/client";
import { ContextEngineCard } from "@/components/ai-feedback/ContextEngineCard";
import type { z } from "zod";

export function PhraseMeaning({ phrase,context }: { phrase:string; context:string }) {
  const [meaning,setMeaning] = useState<z.infer<typeof ChunkingSchema> | null>(null);
  const [dictionary,setDictionary] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function explain() {
    setBusy(true);setError("");
    try {setMeaning(ChunkingSchema.parse(await requestJSON("/api/ai/analyze",{method:"POST",body:JSON.stringify({mode:"chunk",input:{phrase,context:context.slice(0,2000)}})})));}
    catch {
      try { const word=phrase.match(/[a-z]+(?:['’][a-z]+)?/gi)?.find((w) => !["a","an","the","my","your","our","their","his","her","of","in","on","as","to"].includes(w.toLowerCase()))?.replaceAll("’", "'"); if (!word) throw new Error(); const data=await requestJSON<{definition:string}>(`/api/learning/definition?word=${encodeURIComponent(word)}`); setDictionary(`Dictionary definition of “${word}” (not a contextual phrase explanation): ${data.definition}`); }
      catch {setError("No explanation is available right now. Keep the phrase in its passage context and retry later.");}
    } finally {setBusy(false);}
  }
  return <div className="space-y-3"><button className="text-xs text-accent underline" disabled={busy} type="button" onClick={explain}>{busy ? "Looking up…" : "Explain this phrase"}</button>{meaning && <div><p className="text-sm mb-3">{meaning.meaning}</p><ContextEngineCard phrase={phrase} data={meaning.context} /></div>}{dictionary && <p className="text-sm text-foreground-muted">{dictionary}</p>}{error && <p role="status" className="text-sm text-amber-200">{error}</p>}</div>;
}
