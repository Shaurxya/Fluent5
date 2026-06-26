// Database types matching the Supabase schema

export type ActivityKey = 'shadow' | 'speak' | 'read' | 'write' | 'review';
export type Difficulty = 'easy' | 'med' | 'hard';
export type TestMode = 'grammar' | 'chunks' | 'mixed';

export interface Profile {
  id: string;
  display_name: string | null;
  streak: number;
  longest_streak: number;
  xp: number;
  last_active: string | null;
  created_at: string;
}

export interface Activity {
  key: ActivityKey;
  title: string;
  description: string | null;
  position: number;
}

export interface Session {
  id: string;
  user_id: string;
  activity_key: ActivityKey;
  done_on: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface Chunk {
  id: string;
  user_id: string;
  text: string;
  note: string | null;
  ef: number;
  reps: number;
  interval: number;
  due_date: string;
  created_at: string;
}

export interface Writing {
  id: string;
  user_id: string;
  prompt: string | null;
  draft_v1: string | null;
  draft_v2: string | null;
  word_count: number | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  level: string | null;
  prompt: string;
  options: string[];
  answer_index: number;
}

export interface TestResult {
  id: string;
  user_id: string;
  mode: TestMode;
  score: number;
  total: number;
  pct: number;
  taken_on: string;
  created_at: string;
}

export interface DailyStat {
  user_id: string;
  day: string;
  xp: number;
  activities: number;
  words_spoken: number;
  chunks_added: number;
  test_pct: number | null;
}

export interface Sentence {
  id: string;
  level: Difficulty;
  text: string;
}

export interface Passage {
  id: string;
  title: string | null;
  body: string;
  level: string | null;
}

// Supabase Database type helper
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      activities: { Row: Activity; Insert: Activity; Update: Partial<Activity> };
      sessions: { Row: Session; Insert: Omit<Session, 'id' | 'created_at'>; Update: Partial<Session> };
      chunks: { Row: Chunk; Insert: Omit<Chunk, 'id' | 'created_at'>; Update: Partial<Chunk> };
      writings: { Row: Writing; Insert: Omit<Writing, 'id' | 'created_at'>; Update: Partial<Writing> };
      quiz_questions: { Row: QuizQuestion; Insert: Omit<QuizQuestion, 'id'>; Update: Partial<QuizQuestion> };
      test_results: { Row: TestResult; Insert: Omit<TestResult, 'id' | 'created_at'>; Update: Partial<TestResult> };
      daily_stats: { Row: DailyStat; Insert: DailyStat; Update: Partial<DailyStat> };
      sentences: { Row: Sentence; Insert: Omit<Sentence, 'id'>; Update: Partial<Sentence> };
      passages: { Row: Passage; Insert: Omit<Passage, 'id'>; Update: Partial<Passage> };
    };
  };
}
