import React from 'react';
import { z } from 'zod';
import { ContextEngineSchema } from '@/lib/ai/schemas';

type ContextData = z.infer<typeof ContextEngineSchema>;

interface ContextEngineCardProps {
  phrase?: string;
  data: ContextData;
}

export function ContextEngineCard({ phrase, data }: ContextEngineCardProps) {
  const getRegisterColor = (register: string) => {
    switch (register) {
      case 'formal': return 'bg-blue-100 text-blue-800';
      case 'informal': return 'bg-orange-100 text-orange-800';
      case 'slang': return 'bg-pink-100 text-pink-800';
      default: return 'bg-emerald-100 text-emerald-300';
    }
  };

  return (
    <div className="w-full max-w-md p-5 rounded-2xl border border-border bg-background-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          {phrase && <h3 className="text-xl font-bold text-foreground mb-1">{phrase}</h3>}
          <div className="flex gap-2 items-center text-sm">
            <span className={`px-2.5 py-0.5 rounded-full font-medium ${getRegisterColor(data.register)}`}>
              {data.register}
            </span>
            <span className="text-foreground-muted capitalize">{data.naturalness}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1">When to use</h4>
          <p className="text-sm text-neutral-700">{data.whenToUse}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1">Who with</h4>
          <p className="text-sm text-neutral-700">{data.whoWith}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2">Real Scenarios</h4>
          <div className="flex flex-col gap-2">
            {data.scenarios.map((s, idx) => (
              <div key={idx} className="bg-background-secondary rounded-lg p-3 text-sm border border-border">
                <span className="font-medium text-foreground block mb-1">{s.situation}</span>
                <span className="text-foreground-muted italic">&ldquo;{s.example}&rdquo;</span>
              </div>
            ))}
          </div>
        </div>

        {data.avoidWhen && (
          <div>
            <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-1">Avoid When</h4>
            <p className="text-sm text-red-600 bg-red-500/10 px-2 py-1.5 rounded">{data.avoidWhen}</p>
          </div>
        )}

        {data.sayItAnotherWay.length > 0 && (
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider mb-2">Or say...</h4>
            <div className="flex flex-wrap gap-2">
              {data.sayItAnotherWay.map((alt, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-md text-sm">
                  <span className="text-foreground">{alt.phrase}</span>
                  <span className={`text-[10px] uppercase px-1 rounded ${getRegisterColor(alt.register)}`}>
                    {alt.register}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
