import React from 'react';
import { z } from 'zod';
import { WritingSchema } from '@/lib/ai/schemas';

type WritingData = z.infer<typeof WritingSchema>;

interface WritingFeedbackProps {
  data: WritingData;
  originalText: string;
}

export function WritingFeedback({ data, originalText }: WritingFeedbackProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Scores Row */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreCard title="Grammar" score={data.scores.grammar} />
        <ScoreCard title="Clarity" score={data.scores.clarity} />
        <ScoreCard title="Naturalness" score={data.scores.naturalness} />
      </div>

      {/* Register Check */}
      <div className="flex items-center gap-4 bg-background-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex-1">
          <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1">Register Match</div>
          <div className="flex items-center gap-2 text-sm">
            Target: <span className="font-semibold">{data.registerCheck.target}</span>
            <span className="text-neutral-300">→</span>
            Detected: <span className={`font-semibold ${data.registerCheck.detected !== data.registerCheck.target ? 'text-amber-600' : 'text-emerald-600'}`}>
              {data.registerCheck.detected}
            </span>
          </div>
        </div>
        {data.registerCheck.mismatches.length > 0 && (
          <div className="flex-1 bg-amber-500/10 p-2 rounded-lg border border-amber-100 text-sm text-amber-200">
            <strong>Mismatches:</strong> {data.registerCheck.mismatches.join(', ')}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Original with Annotations */}
        <div className="bg-background-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-4">Your Text</h3>
          <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap font-serif">
            {originalText}
          </div>
          
          {data.annotations.length > 0 && (
            <div className="mt-6 space-y-3 pt-6 border-t border-border">
              <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Feedback</h4>
              {data.annotations.map((ann, idx) => (
                <div key={idx} className="bg-background-secondary p-3 rounded-lg border border-border text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-foreground">&ldquo;{ann.span}&rdquo;</span>
                    <span className="text-[10px] uppercase bg-neutral-200 text-foreground-muted px-1.5 py-0.5 rounded font-medium">
                      {ann.type}
                    </span>
                  </div>
                  <div className="text-foreground-muted mb-2">{ann.comment}</div>
                  <div className="bg-background-card px-2 py-1.5 rounded border border-border text-emerald-300">
                    <span className="font-medium mr-1">Fix:</span>{ann.suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rewrite & Changes */}
        <div className="space-y-6">
          <div className="bg-accent/10 p-6 rounded-2xl border border-accent/20 shadow-sm">
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">Polished Version</h3>
            <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap font-serif">
              {data.rewrite}
            </div>
          </div>

          <div className="bg-background-card p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">What Changed & Why</h3>
            <ul className="space-y-2 text-sm text-neutral-700 list-disc list-inside">
              {data.whatChanged.map((change, i) => <li key={i}>{change}</li>)}
            </ul>
          </div>

          {data.levelUp && (
            <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-100 shadow-sm flex gap-3 items-start">
              <span className="text-xl">🚀</span>
              <div>
                <h3 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-1">Level Up</h3>
                <p className="text-sm text-emerald-300">{data.levelUp}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ title, score }: { title: string, score: number }) {
  const getColor = (s: number) => {
    if (s >= 90) return 'text-emerald-600';
    if (s >= 75) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-background-card p-4 rounded-xl border border-border text-center shadow-sm">
      <div className={`text-3xl font-bold mb-1 ${getColor(score)}`}>{score}</div>
      <div className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">{title}</div>
    </div>
  );
}
