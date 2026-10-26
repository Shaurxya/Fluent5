// Streak calculation logic

export interface StreakUpdate {
  streak: number;
  longest_streak: number;
  last_active: string;
}

export function calculateStreak(
  currentStreak: number,
  longestStreak: number,
  lastActive: string | null
): StreakUpdate {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  if (!lastActive) {
    // First ever activity
    return {
      streak: 1,
      longest_streak: Math.max(longestStreak, 1),
      last_active: todayStr,
    };
  }

  // Match the database's UTC calendar, independent of the learner's device timezone.
  const daysDiff = Math.round((Date.parse(todayStr) - Date.parse(lastActive)) / 86400000);

  if (daysDiff === 0) {
    // Already active today — no change
    return {
      streak: currentStreak,
      longest_streak: longestStreak,
      last_active: todayStr,
    };
  }

  if (daysDiff === 1) {
    // Consecutive day — increment
    const newStreak = currentStreak + 1;
    return {
      streak: newStreak,
      longest_streak: Math.max(longestStreak, newStreak),
      last_active: todayStr,
    };
  }

  // Streak broken — reset to 1
  return {
    streak: 1,
    longest_streak: longestStreak,
    last_active: todayStr,
  };
}
