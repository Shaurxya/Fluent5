-- Migration: 002_ai_feedback.sql

-- 1. Create ai_analyses table
CREATE TABLE public.ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    mode TEXT NOT NULL,
    input_jsonb JSONB NOT NULL,
    output_jsonb JSONB,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ai_analyses
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

-- Policies for ai_analyses
CREATE POLICY "Users can insert their own analyses."
    ON public.ai_analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own analyses."
    ON public.ai_analyses FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Extend chunks table with context_jsonb
-- Assuming the chunks table already exists based on earlier spec
ALTER TABLE public.chunks
ADD COLUMN IF NOT EXISTS context_jsonb JSONB;

-- 3. Extend test_results / daily_stats with new metrics
-- We'll assume a daily_stats table exists or create it if missing, but to be safe we'll alter test_results if it exists.
-- DO block to conditionally alter table since we don't know the exact schema for test_results
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'test_results'
    ) THEN
        ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS fluency_score INTEGER;
        ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS naturalness_score INTEGER;
    END IF;
END
$$;
