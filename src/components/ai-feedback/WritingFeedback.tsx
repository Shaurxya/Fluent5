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
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <div className="flex-1">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Register Match</div>
          <div className="flex items-center gap-2 text-sm">
            Target: <span className="font-semibold">{data.registerCheck.target}</span>
            <span className="text-neutral-300">→</span>
            Detected: <span className={`font-semibold ${data.registerCheck.detected !== data.registerCheck.target ? 'text-amber-600' : 'text-emerald-600'}`}>
              {data.registerCheck.detected}
            </span>
          </div>
        </div>
        {data.registerCheck.mismatches.length > 0 && (
          <div className="flex-1 bg-amber-50 p-2 rounded-lg border border-amber-100 text-sm text-amber-800">
            <strong>Mismatches:</strong> {data.registerCheck.mismatches.join(', ')}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Original with Annotations */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Your Text</h3>
          <div className="text-neutral-800 text-sm leading-relaxed whitespace-pre-wrap font-serif">
            {originalText}
          </div>
          
          {data.annotations.length > 0 && (
            <div className="mt-6 space-y-3 pt-6 border-t border-neutral-100">
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Feedback</h4>
              {data.annotations.map((ann, idx) => (
                <div key={idx} className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-neutral-800">"{ann.span}"</span>
                    <span className="text-[10px] uppercase bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded font-medium">
                      {ann.type}
                    </span>
                  </div>
                  <div className="text-neutral-600 mb-2">{ann.comment}</div>
                  <div className="bg-white px-2 py-1.5 rounded border border-neutral-200 text-emerald-700">
                    <span className="font-medium mr-1">Fix:</span>{ann.suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rewrite & Changes */}
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
            <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wider mb-4">Polished Version</h3>
            <div className="text-indigo-950 text-sm leading-relaxed whitespace-pre-wrap font-serif">
              {data.rewrite}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">What Changed & Why</h3>
            <ul className="space-y-2 text-sm text-neutral-700 list-disc list-inside">
              {data.whatChanged.map((change, i) => <li key={i}>{change}</li>)}
            </ul>
          </div>

          {data.levelUp && (
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm flex gap-3 items-start">
              <span className="text-xl">🚀</span>
              <div>
                <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-1">Level Up</h3>
                <p className="text-sm text-emerald-900">{data.levelUp}</p>
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
    <div className="bg-white p-4 rounded-xl border border-neutral-200 text-center shadow-sm">
      <div className={`text-3xl font-bold mb-1 ${getColor(score)}`}>{score}</div>
      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{title}</div>
    </div>
  );
}
