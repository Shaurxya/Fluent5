// SM-2 Spaced Repetition Algorithm
// Based on the SuperMemo 2 algorithm by Piotr Wozniak

export interface SM2Input {
  quality: number; // 0-5 (Again=0, Hard=2, Good=4, Easy=5)
  ef: number; // easiness factor (>= 1.3)
  interval: number; // current interval in days
  reps: number; // number of consecutive correct recalls
}

export interface SM2Result {
  ef: number;
  interval: number;
  reps: number;
  dueDate: Date;
}

export function sm2(input: SM2Input): SM2Result {
  let { quality, ef, interval, reps } = input;

  if (quality < 3) {
    // Failed — reset
    reps = 0;
    interval = 1;
  } else {
    // Passed
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    reps += 1;
  }

  // Update easiness factor
  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return { ef: Math.round(ef * 100) / 100, interval, reps, dueDate };
}

// Map button labels to quality scores
export const GRADE_MAP = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
} as const;

export type Grade = keyof typeof GRADE_MAP;
