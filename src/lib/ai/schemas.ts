import { z } from 'zod';

// Shared Engines
export const PacingEngineSchema = z.object({
  thoughtGroups: z.array(z.string()),
  pauseMap: z.array(
    z.object({
      afterWordIndex: z.number(),
      type: z.enum(['short', 'long']),
      natural: z.boolean(),
      note: z.string().optional(),
    })
  ),
  stress: z.array(
    z.object({
      word: z.string(),
      shouldStress: z.boolean(),
      didStress: z.null().describe("Cannot measure spoken stress from a transcript."),
    })
  ),
  rushedAt: z.array(
    z.object({
      span: z.string(),
      note: z.string(),
    })
  ).max(0).describe("No acoustic timing is available; return an empty array."),
  tip: z.string(),
});

export const ContextEngineSchema = z.object({
  register: z.enum(['formal', 'neutral', 'informal', 'slang']),
  whenToUse: z.string(),
  whoWith: z.string(),
  scenarios: z.array(
    z.object({
      situation: z.string(),
      example: z.string(),
    })
  ),
  avoidWhen: z.string().optional(),
  naturalness: z.enum(['very common', 'common', 'somewhat formal', 'dated', 'regional']),
  sayItAnotherWay: z.array(
    z.object({
      phrase: z.string(),
      register: z.enum(['formal', 'neutral', 'informal', 'slang']),
    })
  ),
});

// Activity 1: Shadowing
export const ShadowingSchema = z.object({
  overallScore: z.number().min(0).max(100),
  wordComparison: z.array(
    z.object({
      word: z.string(),
      status: z.enum(['correct', 'missing', 'extra', 'substituted']),
      heard: z.string().nullable(),
      note: z.string().nullable(),
    })
  ),
  pacing: PacingEngineSchema,
  intonation: z.null().describe("Acoustic intonation cannot be assessed from text."),
  topFixes: z.array(z.string()).max(3),
  encouragement: z.string(),
});

// Activity 2: Speaking
export const SpeakingSchema = z.object({
  fluencyScore: z.number().min(0).max(100),
  metrics: z.object({
    wordsPerMinute: z.null().describe("Use the deterministic NLP engine for pace when duration is available."),
    fillerCount: z.number(),
    fillerWords: z.array(z.object({ word: z.string(), count: z.number() })),
    falseStarts: z.number(),
    longUnnaturalPauses: z.null(),
    vocabularyRange: z.enum(['low', 'medium', 'high']),
  }),
  grammarIssues: z.array(
    z.object({
      span: z.string(),
      issue: z.string(),
      fix: z.string(),
      severity: z.enum(['minor', 'moderate', 'major']),
    })
  ),
  translationTells: z.array(
    z.object({
      span: z.string(),
      whyAwkward: z.string(),
      natural: z.string(),
    })
  ),
  chunkSuggestions: z.array(
    z.object({
      instead: z.string(),
      use: z.string(),
      scenario: z.string(),
    })
  ),
  pacing: z.object({
    tip: z.string(),
    rushedAt: z.array(z.string()).max(0),
  }),
  strengths: z.array(z.string()).min(1).max(2),
  nextFocus: z.string(),
});

// Activity 3: Chunking
export const ChunkingSchema = z.object({
  phrase: z.string(),
  meaning: z.string(),
  context: ContextEngineSchema,
  collocations: z.array(z.string()),
});

// Activity 4: Writing
export const WritingSchema = z.object({
  scores: z.object({
    grammar: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    naturalness: z.number().min(0).max(100),
  }),
  annotations: z.array(
    z.object({
      span: z.string(),
      type: z.enum(['grammar', 'word-choice', 'register', 'wordiness', 'naturalness']),
      comment: z.string(),
      suggestion: z.string(),
    })
  ),
  registerCheck: z.object({
    detected: z.string(),
    target: z.string(),
    mismatches: z.array(z.string()),
  }),
  rewrite: z.string(),
  whatChanged: z.array(z.string()),
  levelUp: z.string(),
});

// Activity 5: Review
export const ReviewSchema = z.object({
  usedCorrectly: z.boolean(),
  scenarioFit: z.enum(['perfect', 'acceptable', 'wrong context']),
  feedback: z.string(),
  betterExample: z.string().nullable(),
  recallQuality: z.number().min(0).max(5),
});

// Fluency Cycle (Read -> Think -> Speak) Schemas

export const ExtractTargetsSchema = z.object({
  targets: z.array(
    z.object({
      chunk: z.string(),
      meaning: z.string(),
      whyUseful: z.string(),
    })
  ),
});

export const GenPromptSchema = z.object({
  prompt: z.string(),
});

export const VocabUpgradeSchema = z.object({
  overused: z.array(
    z.object({
      word: z.string(),
      count: z.number(),
      alternatives: z.array(z.string()),
    })
  ),
  upgrades: z.array(
    z.object({
      youSaid: z.string(),
      tryInstead: z.string(),
      meaning: z.string(),
      scenario: z.string(),
      register: z.enum(['formal', 'neutral', 'informal']),
    })
  ),
  missedTargets: z.array(
    z.object({
      chunk: z.string(),
      whereItWouldHaveFit: z.string(),
    })
  ),
});

export type ShadowingAnalysis = z.infer<typeof ShadowingSchema>;
export type SpeakingAnalysis = z.infer<typeof SpeakingSchema>;
export type ChunkingAnalysis = z.infer<typeof ChunkingSchema>;
export type WritingAnalysis = z.infer<typeof WritingSchema>;
export type ReviewAnalysis = z.infer<typeof ReviewSchema>;
export type ExtractTargetsAnalysis = z.infer<typeof ExtractTargetsSchema>;
export type GenPromptAnalysis = z.infer<typeof GenPromptSchema>;
export type VocabUpgradeAnalysis = z.infer<typeof VocabUpgradeSchema>;
