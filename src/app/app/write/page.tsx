"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  PenTool,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WRITING_PROMPTS = [
  "Write about a time you had to step out of your comfort zone.",
  "Describe a technology that has changed your life and explain how.",
  "Write a letter to your future self, 5 years from now.",
  "Argue for or against: Social media does more harm than good.",
  "Describe the most beautiful place you've ever seen.",
  "Write about a lesson you learned the hard way.",
  "Explain why a particular hobby is important to you.",
  "Describe your ideal work environment and why it suits you.",
  "Write about a person who deserves more recognition and why.",
  "Argue for or against: Remote work is the future of employment.",
  "Describe a cultural tradition that is meaningful to you.",
  "Write about a problem in your community and propose a solution.",
];

interface GrammarIssue {
  message: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
  rule: { category: { name: string } };
  context: { text: string; offset: number; length: number };
}

export default function WritePage() {
  const supabase = createClient();
  const [prompt, setPrompt] = useState("");
  const [draftV1, setDraftV1] = useState("");
  const [draftV2, setDraftV2] = useState("");
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<"v1" | "v2">("v1");
  const [savedV1, setSavedV1] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrompt(WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]);
  }, []);

  async function checkGrammar() {
    const text = mode === "v1" ? draftV1 : draftV2;
    if (!text.trim()) {
      toast.error("Write something first!");
      return;
    }

    setChecking(true);
    try {
      const params = new URLSearchParams({
        text,
        language: "en-US",
      });

      const res = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });

      if (res.ok) {
        const data = await res.json();
        setIssues(data.matches);
        if (data.matches.length === 0) {
          toast.success("No issues found! Great writing 🎉");
        } else {
          toast.info(`Found ${data.matches.length} suggestion(s)`);
        }
      } else {
        toast.error("Grammar check failed. Try again later.");
      }
    } catch {
      toast.error("Failed to connect to grammar checker");
    }
    setChecking(false);
  }

  function applySuggestion(issue: GrammarIssue) {
    if (issue.replacements.length === 0) return;
    const text = mode === "v1" ? draftV1 : draftV2;
    const before = text.slice(0, issue.offset);
    const after = text.slice(issue.offset + issue.length);
    const newText = before + issue.replacements[0].value + after;

    if (mode === "v1") setDraftV1(newText);
    else setDraftV2(newText);

    setIssues((prev) => prev.filter((i) => i !== issue));
    toast.success("Suggestion applied");
  }

  async function saveWriting() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const text = mode === "v1" ? draftV1 : draftV2;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    if (mode === "v1" && !savedV1) {
      await supabase.from("writings").insert({
        user_id: user.id,
        prompt,
        draft_v1: draftV1,
        word_count: wordCount,
      });
      setSavedV1(true);
      setMode("v2");
      setDraftV2(draftV1);
      setIssues([]);
      toast.success("Draft v1 saved! Now rewrite and polish it.");
    } else {
      // Update with v2
      const { data: existing } = await supabase
        .from("writings")
        .select("id")
        .eq("user_id", user.id)
        .eq("prompt", prompt)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        await supabase.from("writings").update({ draft_v2: draftV2, word_count: wordCount }).eq("id", existing.id);
      }

      // Complete activity
      await supabase.from("sessions").upsert(
        {
          user_id: user.id,
          activity_key: "write",
          done_on: today,
          payload: { prompt, word_count: wordCount },
        },
        { onConflict: "user_id,activity_key,done_on" }
      );

      await supabase.from("profiles").select("xp").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          supabase.from("profiles").update({ xp: (data.xp || 0) + 30, last_active: today }).eq("id", user.id);
        }
      });

      setCompleted(true);
      toast.success("Writing complete! +30 XP ✨");
    }
    setSaving(false);
  }

  const currentText = mode === "v1" ? draftV1 : draftV2;
  const wordCount = currentText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
            Write & Rewrite
          </h1>
        </div>
        <p className="text-foreground-muted">
          Write a draft, check grammar, then polish your rewrite.
        </p>
      </div>

      {/* Prompt */}
      <div className="rounded-2xl bg-background-card border border-border p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-foreground-muted uppercase tracking-wider">
            Writing Prompt
          </span>
          <button
            onClick={() =>
              setPrompt(
                WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]
              )
            }
            className="text-xs text-accent hover:underline flex items-center gap-1"
            disabled={savedV1}
          >
            <RefreshCw className="w-3 h-3" /> New prompt
          </button>
        </div>
        <p className="text-lg font-medium">&ldquo;{prompt}&rdquo;</p>
      </div>

      {/* Mode tabs */}
      {savedV1 && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("v1")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mode === "v1"
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-background-card border border-border text-foreground-muted"
            )}
          >
            Draft v1
          </button>
          <button
            onClick={() => setMode("v2")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              mode === "v2"
                ? "gradient-bg text-white"
                : "bg-background-card border border-border text-foreground-muted"
            )}
          >
            Rewrite v2 ✨
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="space-y-4">
        <textarea
          value={mode === "v1" ? draftV1 : draftV2}
          onChange={(e) =>
            mode === "v1" ? setDraftV1(e.target.value) : setDraftV2(e.target.value)
          }
          placeholder="Start writing..."
          readOnly={mode === "v1" && savedV1}
          className={cn(
            "w-full min-h-[250px] p-6 rounded-2xl bg-background-card border border-border text-foreground placeholder:text-foreground-subtle resize-y focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all leading-relaxed",
            mode === "v1" && savedV1 && "opacity-60"
          )}
        />

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-muted">
            {wordCount} words
          </span>
          <div className="flex gap-2">
            <button
              onClick={checkGrammar}
              disabled={checking || !currentText.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:border-border-hover text-sm font-medium transition-all disabled:opacity-50"
            >
              {checking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent" />
              )}
              Check Grammar
            </button>
            {!completed && (
              <button
                onClick={saveWriting}
                disabled={saving || !currentText.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savedV1 ? "Save v2 & Complete (+30 XP)" : "Save as v1"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grammar Issues */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold font-[family-name:var(--font-outfit)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            {issues.length} Suggestion{issues.length !== 1 ? "s" : ""}
          </h3>
          {issues.map((issue, i) => (
            <div
              key={i}
              className="rounded-xl bg-background-card border border-border p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-warning font-medium">
                    {issue.rule.category.name}
                  </span>
                  <p className="text-sm mt-1">{issue.message}</p>
                </div>
                {issue.replacements.length > 0 && (
                  <button
                    onClick={() => applySuggestion(issue)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-all"
                  >
                    Apply: &ldquo;{issue.replacements[0].value}&rdquo;
                  </button>
                )}
              </div>
              <div className="text-xs text-foreground-muted bg-background-secondary rounded-lg px-3 py-2 font-mono">
                ...{issue.context.text}...
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completion */}
      {completed && (
        <div className="rounded-2xl bg-success/10 border border-success/20 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
          <h3 className="text-lg font-semibold font-[family-name:var(--font-outfit)] mb-1">
            Writing complete! ✍️
          </h3>
          <p className="text-foreground-muted text-sm">
            Great work polishing your writing today.
          </p>
        </div>
      )}
    </div>
  );
}
