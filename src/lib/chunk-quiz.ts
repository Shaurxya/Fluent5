// Generate fill-in-the-gap quiz questions from user's chunks
import { type Chunk } from "@/lib/supabase/types";

export interface ChunkQuestion {
  prompt: string;
  options: string[];
  answer_index: number;
}

// Words to use as distractors
const DISTRACTOR_POOL = [
  "however", "although", "therefore", "nevertheless", "furthermore",
  "consequently", "meanwhile", "specifically", "essentially", "particularly",
  "significant", "remarkable", "considerable", "substantial", "fundamental",
  "approximately", "occasionally", "frequently", "gradually", "ultimately",
  "important", "different", "necessary", "available", "possible",
  "situation", "experience", "environment", "development", "information",
];

function getRandomWord(exclude: string[]): string {
  const available = DISTRACTOR_POOL.filter(
    (w) => !exclude.includes(w.toLowerCase())
  );
  return available[Math.floor(Math.random() * available.length)] || "something";
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateChunkQuestions(
  chunks: Chunk[],
  count: number = 10
): ChunkQuestion[] {
  const selected = shuffleArray(chunks).slice(0, count);
  const questions: ChunkQuestion[] = [];

  for (const chunk of selected) {
    const words = chunk.text.split(/\s+/);
    if (words.length < 2) continue;

    // Pick a word to blank out (prefer longer words)
    const longWords = words.filter((w) => w.replace(/[^a-zA-Z]/g, "").length >= 4);
    const targetWords = longWords.length > 0 ? longWords : words;
    const targetWord = targetWords[Math.floor(Math.random() * targetWords.length)];
    const cleanTarget = targetWord.replace(/[^a-zA-Z'-]/g, "").toLowerCase();

    // Create the gap sentence
    const gapSentence = chunk.text.replace(targetWord, "______");

    // Generate distractors
    const distractors = new Set<string>();
    while (distractors.size < 3) {
      const d = getRandomWord([cleanTarget, ...Array.from(distractors)]);
      distractors.add(d);
    }

    const options = shuffleArray([cleanTarget, ...Array.from(distractors)]);
    const answer_index = options.indexOf(cleanTarget);

    questions.push({
      prompt: `Fill in the blank: "${gapSentence}"`,
      options,
      answer_index,
    });
  }

  return questions;
}
