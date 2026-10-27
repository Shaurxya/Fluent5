"use client";
import { useState } from "react";
import { ChunkingSchema } from "@/lib/ai/schemas";
import { requestJSON } from "@/lib/nlp/client";
import { ContextEngineCard } from "@/components/ai-feedback/ContextEngineCard";
import { z } from "zod";

export function PhraseMeaning({ phrase,context }: { phrase:string; context:string }) {
  const [meaning,setMeaning] = useState<z.infer<typeof ChunkingSchema> | null>(null);
  const [dictionary,setDictionary] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function explain() {
    setBusy(true);setError("");setMeaning(null);setDictionary("");
    try {setMeaning(ChunkingSchema.parse(await requestJSON("/api/ai/analyze",{method:"POST",body:JSON.stringify({mode:"chunk",input:{phrase,context:context.slice(0,2000)}})})));}
    catch (cause) {
      setError(cause instanceof Error && !(cause instanceof z.ZodError)
        ? `Contextual explanation unavailable: ${cause.message}`
        : "The phrase explanation returned an incompatible response. Please retry.");
      // A phrase's first word may have no dictionary entry (especially adverbs).
      // Try a bounded set of distinct content words, without inventing a phrase meaning.
      const stopWords = new Set(["a","an","the","my","your","our","their","his","her","of","in","on","as","to"]);
      const words = [...new Set((phrase.match(/[a-z]+(?:['’][a-z]+)?/gi) ?? [])
        .map(word => word.toLowerCase().replaceAll("’", "'"))
        .filter(word => !stopWords.has(word)))].slice(0,3);
      let found = false;
      for (const word of words) {
        try {
          const data = z.object({definition:z.string().min(1)}).parse(await requestJSON(`/api/learning/definition?word=${encodeURIComponent(word)}`));
          setDictionary(`Dictionary definition of “${word}” (not a contextual phrase explanation): ${data.definition}`);
          found = true;
          break;
        } catch { /* Try the next word when this entry/provider is unavailable. */ }
      }
      if (!found) setError(message => `${message} No dictionary definition was found either. Keep the phrase in its passage context and retry later.`);
    } finally {setBusy(false);}
  }
  return <div className="space-y-3"><button className="text-xs text-accent underline" disabled={busy} type="button" onClick={explain}>{busy ? "Looking up…" : "Explain this phrase"}</button>{meaning && <div><p className="text-sm mb-3">{meaning.meaning}</p><ContextEngineCard phrase={phrase} data={meaning.context} /></div>}{dictionary && <p className="text-sm text-foreground-muted">{dictionary}</p>}{error && <p role="status" className="text-sm text-amber-200">{error}</p>}</div>;
}
