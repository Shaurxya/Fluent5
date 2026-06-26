import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject, streamObject } from 'ai';
import { z } from 'zod';
import {
  ShadowingSchema,
  SpeakingSchema,
  ChunkingSchema,
  WritingSchema,
  ReviewSchema,
  ExtractTargetsSchema,
  GenPromptSchema,
  VocabUpgradeSchema,
} from '@/lib/ai/schemas';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { getAccess, checkIdempotency, logAnalysis } from '@/lib/ai/db-helpers';

export const maxDuration = 60; // Set higher timeout for deep calls if on Vercel

const MODEL_FAST = 'openai/gpt-4o-mini';
const MODEL_DEEP = 'openai/gpt-4o';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  extraBody: { max_tokens: 1500 }
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const body = await req.json();

    if (!body.debug && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = user?.id || 'debug-user';
    const { mode, input, sessionId } = body;

    if (!mode || !input) {
      return NextResponse.json({ error: 'Missing mode or input' }, { status: 400 });
    }

    // 1. Check Rate Limits (Deep vs Fast)
    const isDeep = ['shadow', 'speak', 'write', 'vocab_upgrade'].includes(mode);
    if (isDeep) {
      const access = await getAccess(userId);
      if (!access.allowed) {
        return NextResponse.json({ 
          error: 'cap_reached', 
          message: 'Daily limit for deep analysis reached.',
          resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
        }, { status: 429 });
      }
    }

    // 2. Idempotency Check
    const cachedOutput = await checkIdempotency(userId, mode, input);
    if (cachedOutput) {
      return NextResponse.json(cachedOutput);
    }

    // 3. Setup Model & Schema
    let systemPrompt = '';
    let schema: z.ZodType<any> = z.any();
    let modelName = isDeep ? MODEL_DEEP : MODEL_FAST;

    switch (mode) {
      case 'shadow':
        systemPrompt = SYSTEM_PROMPTS.shadow;
        schema = ShadowingSchema;
        break;
      case 'speak':
        systemPrompt = SYSTEM_PROMPTS.speak;
        schema = SpeakingSchema;
        break;
      case 'chunk':
        systemPrompt = SYSTEM_PROMPTS.chunk;
        schema = ChunkingSchema;
        break;
      case 'write':
        systemPrompt = SYSTEM_PROMPTS.write;
        schema = WritingSchema;
        break;
      case 'review':
        systemPrompt = SYSTEM_PROMPTS.review;
        schema = ReviewSchema;
        break;
      case 'extract_targets':
        systemPrompt = SYSTEM_PROMPTS.extract_targets;
        schema = ExtractTargetsSchema;
        break;
      case 'gen_prompt':
        systemPrompt = SYSTEM_PROMPTS.gen_prompt;
        schema = GenPromptSchema;
        break;
      case 'vocab_upgrade':
        systemPrompt = SYSTEM_PROMPTS.vocab_upgrade;
        schema = VocabUpgradeSchema;
        break;
      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const promptText = JSON.stringify(input, null, 2);

    // 4. Execute AI Call
    // For streaming (speak, write) we use streamObject
    if ((mode === 'speak' || mode === 'write') && body.stream !== false) {
      const result = await streamObject({
        model: openrouter(modelName),
        schema,
        system: systemPrompt,
        prompt: promptText,
        onFinish: async ({ object }) => {
          if (object) {
            await logAnalysis(userId, sessionId, mode, input, object, modelName);
          }
        }
      });
      return result.toTextStreamResponse();
    } 
    // For non-streaming (shadow, chunk, review) we use generateObject
    else {
      let result;
      try {
        result = await generateObject({
          model: openrouter(modelName),
          schema,
          system: systemPrompt,
          prompt: promptText,
        });
      } catch (e: any) {
        // Retry logic for parsing failures (Vercel AI SDK does this automatically if configured, but we can do a naive retry)
        console.warn('AI Parsing failed, retrying once...', e);
        result = await generateObject({
          model: openrouter(modelName),
          schema,
          system: systemPrompt + "\n\nCRITICAL: You must return valid JSON strictly matching the schema.",
          prompt: promptText,
        });
      }

      const object = result.object;
      
      // Log it async
      logAnalysis(userId, sessionId, mode, input, object, modelName).catch(console.error);
      
      return NextResponse.json(object);
    }

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error', stack: error.stack }, { status: 500 });
  }
}
