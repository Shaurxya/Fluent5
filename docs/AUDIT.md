# FluentFive baseline audit

Baseline: clean `main`, isolated on `feat/nlp-learning-engine`. No pre-existing edits. No production systems accessed.

## Architecture before changes

- Next.js 16.2.9 App Router / React 19 / TypeScript / Tailwind 4.
- `/` redirects to `/fluentfive`; `/login` uses Supabase Google OAuth and magic links; `src/proxy.ts` refreshes sessions and protects `/app`.
- `/app` is a static activity dashboard. `/app/cycle` uses Wikipedia, browser recognition, two OpenRouter calls and LanguageTool. It does not persist sessions or missed chunks.
- Standalone `/app/{speak,shadow,read,write,review,test,progress}` use client-side Supabase operations. Shadowing uses ElevenLabs and local browser audio recordings. Writing uses LanguageTool. Review uses SM-2.
- `/api/ai/analyze`: structured OpenRouter generation, analysis logging; `/api/tts`: ElevenLabs proxy.
- Supabase migrations 001/002: profiles, activities, daily sessions, chunks, writings, quizzes/results, daily stats, seed content, AI analyses. User-owned tables have RLS.
- `src/components/portfolio` and animation utilities remain as existing extension assets. No active portfolio route.
- No automated test runner, Python service, CI, environment example, or installed dependencies at baseline.

## Confirmed gaps

- Static dashboard streak/completion; missing activity/profile/account routes; decorative search/filter controls.
- Cycle save button only moves to a completion screen. No session/result persistence.
- AI debug body flag bypasses auth. TTS lacks auth, quotas and input limits. Error responses disclose stacks.
- AI idempotency hashes input but does not compare/store it, returning unrelated recent results. Rate checking fails open.
- Some XP mutations are unawaited; client-side read/modify/write can race; repeat completion can award duplicate XP. Streak helper unused.
- Writing/shadow feedback components disconnected. Transcript-only AI schemas claim acoustic features without supporting data.
- Progress XP is approximated from activity count. Test history is stored but not plotted.
- README omits AI/voice keys, second migration and missing `.env.example`, and incorrectly guarantees zero cost/production readiness.

## Baseline checks

- `npm run lint`: could not start (`eslint: command not found`).
- `npm run build`: could not start (`next: command not found`).
- After installing dependencies and before editing application code: lint reported 55 errors/19 warnings; TypeScript passed; build failed fetching Google Fonts. The lockfile also needed repair for missing @emnapi entries.
- Available default Python is 3.15; Python 3.11 is available and selected for NLP wheel compatibility.
- Local credentials absent; live Supabase, OAuth, paid AI, microphone and production tests cannot be claimed.

See IMPLEMENTATION.md for current implementation and verification status.
