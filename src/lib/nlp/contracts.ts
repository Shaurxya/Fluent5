import { z } from "zod";

export const analysisInputSchema = z.object({
  attempt_id: z.uuid(),
  mode: z.enum(["grammar", "vocabulary", "semantics", "speak", "write", "read", "shadow", "cycle"]),
  text: z.string().min(1).max(12000).refine((s) => /\p{L}/u.test(s), "Enter words to analyze."),
  prompt: z.string().max(2000).default(""),
  reference: z.string().max(12000).default(""),
  expected_answer: z.string().max(2000).default(""),
  targets: z.array(z.string().min(1).max(180)).max(30).default([]),
  duration_seconds: z.number().positive().max(1800).nullable().default(null),
  target_register: z.enum(["neutral", "formal", "informal"]).default("neutral"),
}).strict().refine((v) => v.mode !== "shadow" || v.reference.trim().length > 0, "Provide a shadowing reference.");

const span = z.object({ text: z.string(), start: z.number().int().nonnegative(), end: z.number().int().nonnegative() });
export const grammarErrorSchema = z.object({
  id: z.string(), start: z.number().int().nonnegative(), end: z.number().int().nonnegative(),
  original: z.string(), category: z.string(), replacements: z.array(z.string()), explanation: z.string(), source: z.string(),
});
const frequency = z.object({ word: z.string(), count: z.number().int().nonnegative() });
export const analysisSchema = z.object({
  version: z.literal("nlp-v1"), request_id: z.uuid(), mode: z.string(), text: z.string(),
  offset_encoding: z.literal("unicode_codepoints"),
  model_info: z.object({ spacy_version: z.string(), spacy_pipeline_version: z.string(), embedding_model: z.string(), embedding_revision: z.string(), embeddings_used: z.boolean() }),
  preprocessing: z.object({ tokens: z.array(span.extend({ lemma: z.string(), pos: z.string().nullable() })), sentences: z.array(span),
    entities: z.array(span.extend({ label: z.string() })), model: z.string(), trained_pipeline: z.boolean() }),
  grammar: z.object({ status: z.enum(["available", "partial"]), corrected_text: z.string(), errors: z.array(grammarErrorSchema), recommendations: z.array(z.string()), note: z.string(), detector_version: z.string() }),
  vocabulary: z.object({ word_count: z.number().int().nonnegative(), unique_lemmas: z.number().int(), content_word_count: z.number().int(),
    type_token_ratio: z.number().min(0).max(1), mattr: z.number().min(0).max(1).nullable(), repetitions: z.array(frequency), keywords: z.array(z.string()),
    chunks: z.array(span.extend({ source: z.string() })), suggestions: z.array(z.object({ original: z.string(), suggestion: z.string(), reason: z.string() })),
    mean_word_length: z.number(), long_word_fraction: z.number(), note: z.string() }),
  semantics: z.object({ status: z.enum(["available", "unavailable", "not_requested"]), method: z.string(), similarity: z.number().nullable(),
    relevance: z.enum(["likely_related", "uncertain", "possibly_off_topic", "not_assessed"]), keyword_coverage: z.number().nullable(), coherence: z.number().nullable(),
    matches: z.array(z.object({ target: z.string(), matched: z.boolean(), method: z.string(), similarity: z.number().nullable().optional() })), duplicate_sentences: z.array(z.array(z.number().int())), note: z.string() }),
  fluency: z.object({ duration_seconds: z.number().nullable(), words_per_minute: z.number().nullable(), filler_count: z.number().int(), fillers: z.array(frequency),
    repetitions: z.array(z.string()), self_correction_markers: z.number().int(), complete_sentence_fraction: z.number().nullable(), grammar_errors_per_100_words: z.number(),
    pause_seconds: z.null(), pronunciation_score: z.null(),
    score: z.object({ value: z.number().int().min(0).max(100), label: z.string(), version: z.string(), components: z.array(z.object({ key: z.string(), value: z.number(), weight: z.number() })) }).nullable(), note: z.string() }),
  shadowing: z.object({ alignment: z.array(z.object({ reference: z.string().nullable(), recognized: z.string().nullable(), operation: z.enum(["equal", "substitution", "deletion", "insertion"]) })),
    substitutions: z.number().int(), deletions: z.number().int(), insertions: z.number().int(), wer: z.number().nonnegative(), lexical_accuracy: z.number(), completion: z.number(), practice_phrases: z.array(z.string()), note: z.string() }).nullable(),
  reading: z.object({ questions: z.array(z.object({ id: z.string(), question: z.string(), expected_answer: z.string() })), reading_ease: z.number(), difficulty: z.string(), note: z.string() }).nullable(),
  writing: z.object({ paragraph_count: z.number().int(), mean_sentence_words: z.number(), suggestions: z.array(z.string()), detected_register: z.string(), register_note: z.string() }).nullable(),
  warnings: z.array(z.string()), latency_ms: z.number().nonnegative(),
});

export const analysisEnvelopeSchema = z.object({ analysis_id: z.uuid(), analysis: analysisSchema, cached: z.boolean() });
export const chunksSchema = z.array(z.object({ text: z.string().trim().min(1).max(500), note: z.string().max(2000).optional(), context: z.record(z.string(), z.unknown()).optional() }).strict()).max(30);
export const completeSchema = z.object({ attempt_id: z.uuid(), activity: z.enum(["speak", "read", "write", "shadow", "review"]), analysis_id: z.uuid().nullable().default(null),
  payload: z.record(z.string(), z.unknown()).default({}), chunks: chunksSchema.default([]) }).strict();
export type Analysis = z.infer<typeof analysisSchema>;
export type AnalysisInput = z.input<typeof analysisInputSchema>;
export type AnalysisEnvelope = z.infer<typeof analysisEnvelopeSchema>;
export type GrammarError = z.infer<typeof grammarErrorSchema>;
export type LearningChunk = z.infer<typeof chunksSchema>[number];
