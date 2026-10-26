import React from 'react';
import { z } from 'zod';
import { PacingEngineSchema } from '@/lib/ai/schemas';

type PacingData = z.infer<typeof PacingEngineSchema>;

interface PacingEngineRendererProps {
  data: PacingData;
  sentence?: string;
}

export function PacingEngineRenderer({ data }: PacingEngineRendererProps) {
  // A simplistic renderer that joins thought groups with the appropriate pause markers.
  // In a robust implementation, this would map the 'afterWordIndex' precisely over the original sentence.
  
  return (
    <div className="p-4 rounded-xl border border-border bg-background-card shadow-sm mt-4">
      <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
        Pacing & Prosody
      </h3>
      
      <div className="text-lg leading-relaxed text-foreground mb-4">
        {data.thoughtGroups.map((group, idx) => {
          // Find if there's a pause after this group (simplification: assume thought groups align with pauses)
          const pause = data.pauseMap.find((p) => p.afterWordIndex === idx);
          const isRushed = data.rushedAt.some(r => r.span.toLowerCase().includes(group.toLowerCase().trim()));
          
          let groupSpan = <span>{group}</span>;
          
          if (isRushed) {
            groupSpan = <span className="underline decoration-amber-400 decoration-2 underline-offset-4">{group}</span>;
          }

          // Very simple stress highlight (bolding words)

          return (
            <React.Fragment key={idx}>
              {groupSpan}
              {pause && (
                <span 
                  className={`mx-1 text-foreground-muted font-light ${pause.natural ? '' : 'text-red-400'}`}
                  title={pause.note}
                >
                  {pause.type === 'short' ? '|' : '‖'}
                </span>
              )}
              {' '}
            </React.Fragment>
          );
        })}
      </div>

      {data.rushedAt.length > 0 && (
        <div className="mb-3 flex flex-col gap-1">
          {data.rushedAt.map((rush, i) => (
            <div key={i} className="text-sm text-amber-200 bg-amber-500/10 px-2 py-1 rounded">
              <span className="font-semibold">Rushed:</span> &ldquo;{rush.span}&rdquo; — {rush.note}
            </div>
          ))}
        </div>
      )}

      {data.tip && (
        <div className="mt-2 text-sm text-accent bg-accent/10 px-3 py-2 rounded-lg flex items-start gap-2">
          <span>💡</span>
          <span>{data.tip}</span>
        </div>
      )}
    </div>
  );
}
