"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { analyzeText, completePractice, saveChunks } from "@/lib/nlp/client";
import type { AnalysisEnvelope } from "@/lib/nlp/contracts";
import { ReadingInsights } from "@/components/nlp/ReadingInsights";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Search,
  BookMarked,
  X,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { Passage, Chunk } from "@/lib/supabase/types";

interface Definition {
  word: string;
  meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
  phonetic?: string;
}

export default function ReadPage() {
  const supabase = createClient();
  const [passage, setPassage] = useState<Passage | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [relatedWords, setRelatedWords] = useState<string[]>([]);
  const [showDefinition, setShowDefinition] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [insights, setInsights] = useState<AnalysisEnvelope | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const attempt = useRef<string | null>(null);

  async function analyzePassage() {
    if (!passage) return;
    setAnalyzing(true); setAnalysisError(""); attempt.current ||= crypto.randomUUID();
    try { setInsights(await analyzeText({ attempt_id: attempt.current, mode: "read", text: passage.body })); }
    catch (e) { setAnalysisError(e instanceof Error ? e.message : "Reading analysis unavailable."); }
    finally { setAnalyzing(false); }
  }

  const loadPassage = useCallback(async () => {
    setLoading(true);
    setInsights(null); setCompleted(false); setAnalysisError(""); attempt.current = null;
    const { data } = await supabase.from("passages").select("*");
    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)];
      setPassage(random as Passage);
    }
    setLoading(false);
  }, [supabase]);

  const loadChunks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("chunks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setChunks(data as Chunk[]);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    supabase.from("passages").select("*").then(({data,error}) => {
      if (!active) return;
      if (data?.length) setPassage(data[Math.floor(Math.random()*data.length)] as Passage);
      if (error) setAnalysisError("Passages could not be loaded. Refresh to retry.");
      setLoading(false);
    });
    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) return;
      const {data} = await supabase.from("chunks").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20);
      if (active && data) setChunks(data as Chunk[]);
    });
    return () => {active=false;};
  }, [supabase]);

  function handleTextSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 1) {
      setSelectedText(text);
      const range = selection!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
    }
  }

  async function saveChunk() {
    if (!selectedText) return;
    setSaving(true);
    try { const result = await saveChunks([{ text: selectedText, note: `From ${passage?.title || "reading"}: ${passage?.body.slice(0,500)}` }]); toast.success(result.saved ? "Phrase saved to review." : "This phrase is already saved."); setShowToolbar(false); await loadChunks(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  }

  async function lookupDefinition() {
    if (!selectedText) return;
    const word = selectedText.split(/\s+/)[0].replace(/[^a-zA-Z]/g, "");
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      if (res.ok) {
        const data = await res.json();
        setDefinition({
          word: data[0].word,
          meanings: data[0].meanings.slice(0, 2),
          phonetic: data[0].phonetic,
        });
        setShowDefinition(true);
        setShowToolbar(false);
      } else {
        toast.error(`No definition found for "${word}"`);
      }
    } catch {
      toast.error("Failed to fetch definition");
    }
  }

  async function findRelated() {
    if (!selectedText) return;
    const word = selectedText.split(/\s+/)[0].replace(/[^a-zA-Z]/g, "");
    try {
      const res = await fetch(
        `https://api.datamuse.com/words?rel_trg=${word}&max=10`
      );
      const data = await res.json();
      setRelatedWords(data.map((d: { word: string }) => d.word));
      setShowRelated(true);
      setShowToolbar(false);
    } catch {
      toast.error("Failed to find related words");
    }
  }

  async function completeActivity() {
    if (!passage) return;
    setSaving(true); attempt.current ||= crypto.randomUUID();
    try {
      const data = await completePractice({ attempt_id: attempt.current, activity: "read", analysis_id: insights?.analysis_id, payload: { passage_id: passage.id, title: passage.title } });
      setCompleted(true); toast.success(`Reading saved. +${data.xp_awarded} XP`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Session save failed."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-outfit)]">
              Active Reading
            </h1>
          </div>
          <p className="text-foreground-muted">
            Read the passage, select phrases to save as chunks.
          </p>
        </div>
        <button
          onClick={loadPassage}
          className="p-2.5 rounded-xl border border-border hover:border-border-hover transition-all"
          title="New passage"
        >
          <RefreshCw className="w-5 h-5 text-foreground-muted" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reading Pane */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-background-card border border-border p-8 relative">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : passage ? (
              <div>
                {passage.title && (
                  <h2 className="text-xl font-bold font-[family-name:var(--font-outfit)] mb-4">
                    {passage.title}
                  </h2>
                )}
                <div
                  onMouseUp={handleTextSelection}
                  className="prose prose-invert prose-lg max-w-none leading-relaxed text-foreground/90 whitespace-pre-wrap cursor-text select-text"
                >
                  {passage.body}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-foreground-muted">
                No passages found. Run the seed script to add content.
              </div>
            )}

            {/* Floating toolbar */}
            {showToolbar && (
              <div
                className="fixed z-50 glass rounded-xl shadow-lg p-2 flex items-center gap-1 animate-fade-in"
                style={{
                  left: `${toolbarPos.x}px`,
                  top: `${toolbarPos.y}px`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <button
                  onClick={saveChunk}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-accent/20 text-accent transition-all"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Save Chunk
                </button>
                <button
                  onClick={lookupDefinition}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-background-card-hover transition-all"
                >
                  <Search className="w-3 h-3" />
                  Define
                </button>
                <button
                  onClick={findRelated}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-background-card-hover transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  Related
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chunks Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-background-card border border-border p-5">
            <h3 className="font-semibold font-[family-name:var(--font-outfit)] mb-3 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-accent" />
              Saved Chunks ({chunks.length})
            </h3>
            {chunks.length === 0 ? (
              <p className="text-foreground-muted text-sm">
                Select text in the passage to save phrases.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="px-3 py-2 rounded-lg bg-background-secondary text-sm border border-border/50"
                  >
                    &ldquo;{chunk.text}&rdquo;
                  </div>
                ))}
              </div>
            )}
          </div>

          {!completed && (
            <button
              onClick={completeActivity}
              disabled={saving || !passage}
              className="w-full py-3 rounded-xl gradient-bg text-white font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Reading
            </button>
          )}

          {completed && (
            <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-sm font-medium">Reading complete! 📖</p>
            </div>
          )}
        </div>
      </div>

      {passage && <section className="space-y-4"><button className="nlp-button" onClick={analyzePassage} disabled={analyzing}>{analyzing ? "Analyzing passage…" : "Explore vocabulary & comprehension"}</button>{analysisError && <p role="alert" className="text-amber-200">{analysisError}</p>}{insights && <ReadingInsights result={insights} />}</section>}

      {/* Definition Modal */}
      {showDefinition && definition && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDefinition(false)}>
          <div className="bg-background-card border border-border rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold font-[family-name:var(--font-outfit)]">{definition.word}</h3>
                {definition.phonetic && (
                  <p className="text-foreground-muted text-sm">{definition.phonetic}</p>
                )}
              </div>
              <button onClick={() => setShowDefinition(false)} className="p-1 rounded-lg hover:bg-background-card-hover">
                <X className="w-5 h-5" />
              </button>
            </div>
            {definition.meanings.map((m, i) => (
              <div key={i} className="mb-3">
                <span className="text-xs uppercase tracking-wider text-accent font-medium">{m.partOfSpeech}</span>
                {m.definitions.slice(0, 2).map((d, j) => (
                  <div key={j} className="mt-1">
                    <p className="text-sm">{d.definition}</p>
                    {d.example && <p className="text-xs text-foreground-muted italic mt-0.5">&ldquo;{d.example}&rdquo;</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Words Modal */}
      {showRelated && relatedWords.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRelated(false)}>
          <div className="bg-background-card border border-border rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-[family-name:var(--font-outfit)]">Related Words</h3>
              <button onClick={() => setShowRelated(false)} className="p-1 rounded-lg hover:bg-background-card-hover">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedWords.map((word) => (
                <span key={word} className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm font-medium">
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
