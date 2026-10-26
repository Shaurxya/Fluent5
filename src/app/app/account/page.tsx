"use client";
import { useState } from "react";
import { useLearningSummary, SummaryError } from "@/components/nlp/LearningSummary";
import { requestJSON } from "@/lib/nlp/client";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const {data,error,reload} = useLearningSummary();
  const [confirm,setConfirm] = useState(false);
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState("");
  async function deleteAnalyses() {
    setBusy(true);setStatus("");
    try { await requestJSON("/api/learning/privacy",{method:"DELETE",body:JSON.stringify({confirm:"DELETE_MY_ANALYSES"})}); setStatus("AI and NLP analyses deleted. Practice completions, drafts and flashcards are retained."); setConfirm(false); }
    catch(e) {setStatus(e instanceof Error ? e.message : "Could not delete analysis history.");}
    finally {setBusy(false);}
  }
  return <div className="max-w-3xl space-y-6"><h1 className="text-2xl font-bold">Account & privacy</h1>{error && <SummaryError error={error} retry={reload} />}{data && <p className="text-foreground-muted">Signed in as {data.profile.email}</p>}
    <section className="nlp-panel space-y-4"><h2 className="text-lg font-semibold">How your practice content is handled</h2><p className="text-sm text-foreground-muted">Your transcripts, drafts and analyses are stored in your private Supabase account records. Browser speech recognition may send microphone audio to its provider. Shadowing recordings stay in browser memory and are discarded when you leave or record again.</p><p className="text-sm text-foreground-muted">Local NLP runs on the configured private service. Optional AI coaching sends the selected text to OpenRouter and its model provider. Grammar checking can send text to the configured LanguageTool server; its fallback uses LanguageTool’s public service. ElevenLabs receives reference sentences for voice generation.</p><p className="text-sm text-foreground-muted">The application does not log learner text by default. Analysis history remains until deleted or until your operator applies a retention policy. Completion payloads, writing drafts and saved phrases have separate retention. This page deletes analyses only.</p>
      {!confirm ? <button className="nlp-button bg-red-700" onClick={() => setConfirm(true)}>Delete my analysis history…</button> : <div className="space-y-3"><p>Delete all saved NLP and AI feedback? This cannot be undone. Practice completions, writing drafts and saved flashcards will remain.</p><div className="flex gap-3"><button className="nlp-button bg-red-700" disabled={busy} onClick={deleteAnalyses}>Confirm deletion</button><button className="nlp-button" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button></div></div>}
    </section><button className="nlp-button" onClick={async () => { await createClient().auth.signOut(); window.location.assign("/login"); }}>Sign out</button>{status && <p role="status">{status}</p>}
  </div>;
}
