import React from 'react';
import { z } from 'zod';
import { SpeakingSchema } from '@/lib/ai/schemas';

type SpeakingData = z.infer<typeof SpeakingSchema>;

interface SpeakingFeedbackProps {
  data: SpeakingData;
}

export function SpeakingFeedback({ data }: SpeakingFeedbackProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 text-center shadow-sm">
          <div className="text-3xl font-bold text-neutral-800 mb-1">{data.fluencyScore}</div>
          <div className="text-xs font-semibold text-neutral-500 uppercase">Fluency Score</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 text-center shadow-sm">
          <div className="text-3xl font-bold text-neutral-800 mb-1">{data.metrics.wordsPerMinute}</div>
          <div className="text-xs font-semibold text-neutral-500 uppercase">WPM</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 text-center shadow-sm">
          <div className="text-3xl font-bold text-neutral-800 mb-1">{data.metrics.fillerCount}</div>
          <div className="text-xs font-semibold text-neutral-500 uppercase">Fillers</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 text-center shadow-sm">
          <div className="text-xl font-bold text-neutral-800 mb-1 capitalize mt-1.5">{data.metrics.vocabularyRange}</div>
          <div className="text-xs font-semibold text-neutral-500 uppercase mt-1.5">Vocab Range</div>
        </div>
      </div>

      {/* Translation Tells */}
      {data.translationTells.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Translation Tells</h3>
          <div className="space-y-4">
            {data.translationTells.map((tell, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-red-50/50 rounded-lg border border-red-100">
                <div>
                  <span className="text-sm font-medium text-red-900 bg-red-100 px-2 py-0.5 rounded">You said:</span>
                  <span className="ml-2 text-red-900">"{tell.span}"</span>
                </div>
                <div className="text-sm text-red-700">{tell.whyAwkward}</div>
                <div className="mt-1">
                  <span className="text-sm font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">Natural:</span>
                  <span className="ml-2 text-emerald-800 font-medium">{tell.natural}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chunk Suggestions */}
      {data.chunkSuggestions.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">Level Up Your Phrasing</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.chunkSuggestions.map((chunk, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 relative overflow-hidden group">
                <div className="text-sm text-neutral-500 line-through mb-1">{chunk.instead}</div>
                <div className="text-lg font-semibold text-neutral-900 mb-2">{chunk.use}</div>
                <div className="text-xs text-neutral-600 bg-white p-2 rounded border border-neutral-200">
                  <span className="font-semibold block mb-1">Scenario:</span> {chunk.scenario}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths & Next Focus */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-3">Strengths</h3>
          <ul className="space-y-2 text-emerald-900 text-sm list-disc list-inside">
            {data.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
          <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wider mb-3">Next Focus</h3>
          <p className="text-indigo-900 text-sm font-medium">{data.nextFocus}</p>
        </div>
      </div>

    </div>
  );
}
