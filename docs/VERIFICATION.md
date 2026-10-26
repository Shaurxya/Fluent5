# Executed verification

This records local checks executed during implementation on Node 24.22.1 / Python 3.11. Hosted systems were not modified. The working branch is `feat/nlp-learning-engine`; the starting `main` worktree was clean.

## Baseline

- Dependencies were absent; initial lint/build could not start.
- Original npm lockfile failed `npm ci` because @emnapi entries were missing/inconsistent; repaired through npm install.
- With dependencies installed: **55 lint errors / 19 warnings**, TypeScript passed, build failed fetching Inter/Outfit from Google Fonts.
- The default machine Python was 3.15; the available Python 3.11 was selected for NLP compatibility.

## Final checks

| Check | Executed result |
|---|---|
| `npm run lint` | Pass, no project errors/warnings after excluding installed Python packages/generated reports. |
| `npm run typecheck` | Pass, including generated Next route types. |
| `npm test` | **37 passed**: 13 API, 13 real local SQL, 6 rendering/save/error, 5 contract/learning algorithm tests. |
| `npm run test:nlp` | **47 passed**: real trained spaCy features, grammar, Unicode, vocabulary, fluency, alignment/WER, FastAPI validation/auth, provider/model failure behavior. Two upstream dependency deprecation warnings remain. |
| `npm run test:integration` | **1 passed**, real local FastAPI HTTP + spaCy/MiniLM + Next gateway + local PostgreSQL persistence/review/stats, with substituted Supabase identity/client transport. |
| `npm run test:e2e` | **7 Chromium tests passed**: mocked email-link provider, cycle-to-review/history/progress, writing, shadowing, service outage recovery, mobile zero state/navigation, microphone denial. |
| `npm run build` | Pass, optimized Next.js 16.2.9 build; public static pages and authenticated dynamic app/API routes generated. Fonts bundled locally. |
| `git diff --check` | Pass. |
| `npm ci --dry-run --ignore-scripts --offline` | Pass; repaired lockfile is consistent. |

The host sandbox blocks listening ports; build worker, browser servers and live HTTP test were rerun with actual host approval. No permission gate was bypassed. One browser assertion initially matched Next's empty route announcer as well as the application's alert; tightening the assertion resolved the test-only failure. Mobile dashboard screenshot was rendered and visually inspected; no horizontal overflow at 390px.

## Actual NLP evaluation

See `nlp-service/evaluation/results.json` and `samples.json` for reproducible inputs and machine-readable measurements. Real spaCy 3.8.7 / en_core_web_sm 3.8.0 and pinned MiniLM model/revision were installed and exercised. On the small development set:

- Grammar: 8 examples; 5 true-positive error spans, 0 false positives, 0 false negatives; precision/recall and exact correction match 1.0.
- Alignment/WER: all 4 authored cases matched expected WER.
- Semantic relationship: all 4 labeled authored examples matched the provisional .35 threshold; cosine values `.6841`, `.0565`, `.4823`, `.1384`.
- JSON response round-trip validation: all 8 grammar responses passed.
- Recorded grammar analysis median **2.43ms**, maximum **246.35ms** including the first small-model load; first semantic case **3159.44ms** including embedding initialization, later cases **12.30–19.21ms** on this machine.

These are actual measurements on a tiny, non-held-out development sample. They are not representative accuracy/latency guarantees. The code documents detector coverage, truncation and scoring assumptions; no CEFR claim is made. Rerunning the harness can change latency measurements.

## Verification boundaries

| Capability | Status |
|---|---|
| spaCy POS/lemmas/NER/token offsets | Real installed model, tested. |
| Sentence embeddings and semantic analysis | Real locally downloaded pinned model, tested. |
| SQL migrations, atomic saves, RLS/ownership, quotas, SM-2, drafts | Executed in local PostgreSQL-compatible PGlite with auth-role shims; not hosted Supabase. |
| Local cross-service request and saved flashcard/stat updates | Actual HTTP inference + gateway + SQL, substituted auth/client transport. |
| Browser exercises and failure states | Actual Chromium/Next UI with mocked auth/providers/storage responses and real Python-generated contract fixtures. |
| Hosted email link / Google OAuth / Supabase project | Not verified: project configuration and credentials absent. |
| OpenRouter / ElevenLabs | Missing-key behavior and UI fallbacks tested; paid live calls not made. |
| LanguageTool | Successful UTF-16 response mapping and failure behavior tested with HTTP mocks; live service not claimed. |
| Wikipedia / dictionary | Integrated with validation/timeouts/fallbacks; browser tests use fixtures, live availability not certified. |
| Physical microphone / ASR provider / real voice playback | Not verified; typed fallback and simulated permission denial tested. |
| Docker image / production deployment / load capacity | Configuration provided, not executed or deployed. |

No actual API keys were committed, no production data was touched, no billed calls were made, and no demonstration learner records were inserted into any connected application database. Isolated tests use clearly labeled synthetic fixtures. Setup and staging steps remain in README, TESTING and DEPLOYMENT.
