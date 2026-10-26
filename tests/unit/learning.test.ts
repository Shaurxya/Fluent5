import { describe, expect, it, vi } from "vitest";
import { currentStreak } from "@/lib/learning/analytics";
import { calculateStreak } from "@/lib/streak";
import { sm2 } from "@/lib/sm2";
import { replaceSpan } from "@/lib/nlp/client";
import { analysisInputSchema, completeSchema } from "@/lib/nlp/contracts";

describe("learning contracts and algorithms",() => {
  it("uses UTC calendar dates and zero activity correctly",() => {
    expect(currentStreak({streak:7,last_active:null},"2026-10-27")).toBe(0);
    expect(currentStreak({streak:7,last_active:"2026-10-26"},"2026-10-27")).toBe(7);
    expect(currentStreak({streak:7,last_active:"2026-10-25"},"2026-10-27")).toBe(0);
    expect(calculateStreak(0,0,null).streak).toBe(1);
  });
  it("keeps streak boundaries consistent across device timezones",() => {
    vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-26T20:00:00Z"));
    expect(calculateStreak(7,9,"2026-10-26").streak).toBe(7);
    expect(calculateStreak(7,9,"2026-10-25").streak).toBe(8);
    expect(calculateStreak(7,9,"2026-10-24").streak).toBe(1);
    vi.useRealTimers();
  });
  it("preserves Unicode and punctuation when applying service offsets",() => {
    expect(replaceSpan("🙂 I goes home.",4,8,"go")).toBe("🙂 I go home.");
  });
  it("SM-2 schedules successful and failed recall",() => {
    expect(sm2({quality:4,reps:0,interval:0,ef:2.5})).toMatchObject({reps:1,interval:1});
    expect(sm2({quality:4,reps:1,interval:1,ef:2.5})).toMatchObject({reps:2,interval:6});
    expect(sm2({quality:0,reps:4,interval:15,ef:1.3})).toMatchObject({reps:0,interval:1,ef:1.3});
  });
  it("rejects unknown fields and invalid shadowing references",() => {
    const base={attempt_id:crypto.randomUUID(),text:"Hello there",mode:"speak"};
    expect(analysisInputSchema.safeParse({...base,debug:true}).success).toBe(false);
    expect(analysisInputSchema.safeParse({...base,text:"a".repeat(12001)}).success).toBe(false);
    expect(analysisInputSchema.safeParse({...base,mode:"shadow"}).success).toBe(false);
    expect(completeSchema.safeParse({attempt_id:crypto.randomUUID(),activity:"unknown"}).success).toBe(false);
  });
});
