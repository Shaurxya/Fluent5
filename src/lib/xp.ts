// XP reward constants for each activity
import { type ActivityKey } from "@/lib/supabase/types";

export const XP_REWARDS: Record<ActivityKey, number> = {
  shadow: 20,
  speak: 25,
  read: 20,
  write: 30,
  review: 10, // per card reviewed
};

export const XP_PER_CHUNK = 15;
export const XP_TEST_MULTIPLIER = 50; // score% * this = XP

export function calculateTestXP(percentage: number): number {
  return Math.round((percentage / 100) * XP_TEST_MULTIPLIER);
}
