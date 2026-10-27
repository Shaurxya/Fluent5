import { z } from "zod";
import { ChunkingSchema, ContextEngineSchema, PacingEngineSchema, ShadowingSchema } from "./schemas";

// Strict providers require every object property to be listed in `required`.
// Keep historical response schemas permissive, but request empty strings for
// optional coaching notes so new output remains compatible with existing UI.
export const ChunkingGenerationSchema = ChunkingSchema.extend({
  context: ContextEngineSchema.extend({
    avoidWhen: z.string().describe("When to avoid this phrase, or an empty string if there is no specific restriction."),
  }),
});

export const ShadowingGenerationSchema = ShadowingSchema.extend({
  pacing: PacingEngineSchema.extend({
    pauseMap: z.array(PacingEngineSchema.shape.pauseMap.element.extend({
      note: z.string().describe("A coaching note, or an empty string if no note is needed."),
    })),
  }),
});
