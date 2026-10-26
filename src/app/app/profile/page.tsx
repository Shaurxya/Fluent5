"use client";
import { useState } from "react";
import { useLearningSummary, SummaryError } from "@/components/nlp/LearningSummary";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const {data,error,reload} = useLearningSummary();
  const [name,setName] = useState<string | null>(null);
  const [status,setStatus] = useState("");
  const [busy,setBusy] = useState(false);
  async function save() {
    setBusy(true); setStatus("");
    try {
      const supabase = createClient();
      const {data:{user}} = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in again to edit your profile.");
      const {error} = await supabase.from("profiles").update({display_name:(name ?? data?.profile.display_name ?? "").trim().slice(0,80)}).eq("id",user.id);
      if (error) throw new Error("Your profile could not be saved.");
      setStatus("Display name saved."); await reload();
    } catch(e) { setStatus(e instanceof Error ? e.message : "Save failed."); }
    finally {setBusy(false);}
  }
  return <div className="max-w-2xl space-y-6"><h1 className="text-2xl font-bold">Your profile</h1>{error && <SummaryError error={error} retry={reload} />}{data && <section className="nlp-panel space-y-4"><p className="text-sm text-foreground-muted">{data.profile.email}</p><label className="block" htmlFor="display-name">Display name</label><input id="display-name" className="nlp-input" maxLength={80} value={name ?? data.profile.display_name ?? ""} onChange={(e) => setName(e.target.value)} /><button className="nlp-button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save profile"}</button><p>{data.profile.xp} XP · {data.profile.streak}-day streak · {data.saved_chunks} saved phrases</p></section>}{status && <p role="status">{status}</p>}</div>;
}
