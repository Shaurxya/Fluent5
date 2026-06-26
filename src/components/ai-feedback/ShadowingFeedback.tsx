import React from 'react';
import { z } from 'zod';
import { ShadowingSchema } from '@/lib/ai/schemas';
import { PacingEngineRenderer } from './PacingEngineRenderer';

type ShadowingData = z.infer<typeof ShadowingSchema>;

interface ShadowingFeedbackProps {
  data: ShadowingData;
  sentence: string;
}

export function ShadowingFeedback({ data, sentence }: ShadowingFeedbackProps) {
  const getWordColor = (status: string) => {
    switch (status) {
      case 'correct': return 'text-emerald-600';
      case 'mispronounced': return 'text-amber-500 font-medium border-b-2 border-amber-300 border-dotted cursor-help';
      case 'missing': return 'text-neutral-300 line-through';
      case 'extra': return 'text-red-500 font-medium cursor-help';
      case 'substituted': return 'text-orange-500 font-medium cursor-help';
      default: return 'text-neutral-800';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Score & Encouragement */}
      <div className="flex items-center gap-6 p-6 bg-white rounded-2xl border border-neutral-200 shadow-sm">
        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" className="stroke-neutral-100" strokeWidth="8" fill="none" />
            <circle 
              cx="50" cy="50" r="40" 
              className={`stroke-emerald-500 transition-all duration-1000 ease-out`} 
              strokeWidth="8" fill="none" 
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * data.overallScore) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-neutral-800">{data.overallScore}</span>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Pronunciation Match</h2>
          <p className="text-neutral-600">{data.encouragement}</p>
        </div>
      </div>

      {/* Word-level comparison */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Word Accuracy</h3>
        <div className="text-xl leading-loose flex flex-wrap gap-x-1.5">
          {data.wordComparison.map((w, idx) => (
            <span 
              key={idx} 
              className={getWordColor(w.status)}
              title={w.note || (w.heard ? `Heard: "${w.heard}"` : undefined)}
            >
              {w.word}
            </span>
          ))}
        </div>
      </div>

      {/* Pacing Engine Output */}
      <PacingEngineRenderer data={data.pacing} sentence={sentence} />

      {/* Top Fixes */}
      {(data.topFixes.length > 0 || data.intonation) && (
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-4">Focus Areas</h3>
          
          {data.intonation && (
            <div className="mb-4 text-blue-900 text-sm">
              <span className="font-semibold">Intonation:</span> {data.intonation}
            </div>
          )}

          <ul className="space-y-2">
            {data.topFixes.map((fix, idx) => (
              <li key={idx} className="flex gap-3 text-blue-900 text-sm">
                <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-700 font-bold text-xs mt-0.5">
                  {idx + 1}
                </span>
                <span>{fix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
