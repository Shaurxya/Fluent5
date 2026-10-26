# FluentFive NLP implementation report

## 1. Architecture before and after

Before: Next.js pages directly mixed Supabase writes, browser speech recognition, LanguageTool and OpenRouter calls. The central cycle did not save completion, several dashboard values were static, some navigation was missing, and AI caching/auth/reward behavior had correctness and security gaps.

After: the existing Next.js/React app remains. A private Python/FastAPI service supplies a real NLP pipeline. The authenticated Next gateway validates requests/results, reserves database quotas and stores analyses. PostgreSQL functions atomically save practice, selected phrases, drafts, XP/streak and SM-2 review. Shared React components present corrections, vocabulary, relevance, measurable fluency and lexical shadowing. Progress and recommendations use actual private history.

The full data flow, algorithms, score formulas and limitations are in [NLP_ARCHITECTURE.md](NLP_ARCHITECTURE.md). The original clean baseline remains on `main`; work is isolated on `feat/nlp-learning-engine`, with changes left reviewable in the working tree.

## 2. New files and folders

- `nlp-service/app`: settings, Pydantic contracts, shared model lifecycle, grammar, vocabulary, semantics, fluency, shadow alignment, reading/writing and combined orchestration/FastAPI routes.
- `nlp-service/tests`, `evaluation`, `scripts`: regression tests, original development samples/results, explicit model download and reproducible contract-fixture generation.
- `nlp-service/requirements*.txt`, constraints, Dockerfile and service setup documentation.
- `src/lib/api`, `src/lib/nlp`, `src/lib/learning`: authentication/validation/error/quotas, typed shared contracts/client and transparent analytics.
- New API routes under `src/app/api/nlp`, `api/learning`, `api/grammar`.
- `src/components/nlp`, `AppShell`, `LearningTrends`: reusable feedback, transcription/local recording, phrase meaning/save, reading comprehension and personalized plans.
- Missing `app/activities`, `app/profile`, `app/account` pages.
- Migration 003, environment example, compose configuration, test runners/fixtures, audit/setup/deployment/methodology/verification documents.

An exact file inventory is appended below.

## 3. Existing files modified

Existing cycle, speaking, shadowing, writing, reading, review, quiz, dashboard and progress routes were refactored/integrated. Authentication callback/proxy/layouts, AI/TTS routes, existing feedback/chart components, theme tokens/fonts, streak/SM-2 helpers, seeding/database-check scripts, dependencies/lockfile and README/config were updated. Original prompt banks, authentication methods, review algorithm, exercise routes, dictionary/related-word lookup and optional voice/AI integrations remain. Portfolio extension assets remain; minor lint/image fixes were applied without deleting them.

## 4. NLP algorithms implemented

Real tokenization, sentence segmentation, trained POS/lemmatization/NER, frequency/stop-word analysis, TTR/MATTR, contextual repetition suggestions, dependency/attested phrase extraction, conservative typed grammar detection/classification and optional LanguageTool, exact-offset correction, MiniLM sentence embeddings/cosine similarity, semantic continuity/duplicates/target matching, text-supported speaking metrics and deterministic practice scores, Levenshtein alignment/WER, reading ease/questions, writing structure/register heuristics, and history-based recommendation rules.

No acoustic pronunciation, pause duration, phonemes, CEFR certification, broad benchmark accuracy or trained recommendation performance is invented.

## 5. Existing features improved

- Flagship cycle retains preparation/speaking limits, gains private analysis, explicit partial-capability notices, remembered phrases and completion history.
- Speaking keeps two-minute prompts/transcription, adds detailed results and a recoverable typed/no-analysis save path.
- Shadowing retains difficulty, ElevenLabs/browser model audio, local recording/replay, and gains valid lexical comparison.
- Writing retains grammar/rewrite workflow, adds highlighted explanations, individual acceptance/dismissal, optional AI polish, original/final persistence and no automatic replacement.
- Reading retains selection/save/dictionary/related-word features, adds real phrase/keyword/entity/difficulty insights and semantic comprehension-answer comparison.
- Review/quiz gain transaction-based persistence, idempotency and bounded rewards.
- Dashboard/search/filter/sort/navigation/profile/account/history/progress are functional and database-backed.

## 6. Bugs fixed

Removed client-supplied AI auth bypass; exact-input cache matching replaces unrelated-result reuse; authenticated/bounded/rate-limited TTS; no stack/input disclosure in public errors; no runtime service-role/RLS bypass. Fixed missing save behavior, unawaited/racy XP writes, duplicate rewards, unused/inconsistent streak updates, unrecorded session paths, broken navigation, placeholder email/streak/completion values, fake XP reconstruction, stale writing correction offsets, local audio cleanup, microphone-error fallback and build-time font network dependency. Legacy transcript-only AI fields now explicitly return null/empty for unmeasured acoustics; this intentional contract correction is documented.

## 7. Database migration

`supabase/migrations/003_nlp_learning.sql` adds `nlp_analyses`, `practice_sessions`, `flashcard_reviews`, `api_usage`, chunk identity and quiz attempt keys/indexes. New functions implement quotas, chunk saving, completion/drafts, review scheduling, quizzes and explicit own-analysis deletion. RLS and function permissions isolate ownership; browser updates to profile XP are revoked. Existing daily history is retained; derived streaks can be recovered from observed legacy dates, while unrecorded historical rewards are not invented. No production migration was executed.

## 8. Environment variables

Required for learning: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NLP_SERVICE_URL`, `NLP_SERVICE_API_KEY`. Configure `NEXT_PUBLIC_APP_URL` for the actual origin. Enable/download embeddings through `NLP_ENABLE_EMBEDDINGS`, `EMBEDDING_MODEL`, `EMBEDDING_REVISION`; optional model/cache selection uses `SPACY_MODEL`, `NLP_MODEL_CACHE`. Optional wider grammar: `LANGUAGETOOL_URL`. Optional contextual AI: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_FAST`, `OPENROUTER_MODEL_DEEP`. Optional voice: `ELEVENLABS_API_KEY`. Only the optional seed script needs `SUPABASE_SERVICE_ROLE_KEY`; the app does not.

All placeholders are in `.env.example`; no actual credentials were added.

## 9. Run commands

After following the model/database setup in README and configuring `.env.local`:

```sh
# Terminal 1, repository root
npm run dev

# Terminal 2, repository root
cd nlp-service
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file ../.env.local --no-access-log
```

Production compile is `npm run build`, then `npm start`; Python must be hosted separately. Local container alternative: `docker compose --env-file .env.local up --build nlp` (not executed here).

## 10. Full workflow

Authenticated learner loads a Wikipedia/seeded passage, explores actual phrases and optional definitions, studies targets, prepares for 45 seconds and speaks/transcribes for up to 90 seconds. Next securely requests Python analysis, validates/stores the result and shows measured metrics, corrections and caveats. The learner chooses what to save; one transaction records the attempt, selected flashcards, daily completion, streak and XP. Due cards use the original SM-2 schedule through a server transaction. History/progress shows saved feedback, actual statistics and evidence-based next practice. Failed analysis/save requests retain the current text/selection and offer retry.

## 11. Tests and build

- 37 Vitest tests passed, including 13 real local PostgreSQL migration/transaction/RLS tests.
- 47 Python tests passed with the trained spaCy model. Two dependency deprecation warnings remain.
- 1 real local cross-service integration test passed with actual FastAPI HTTP inference/MiniLM and SQL persistence.
- 7 Chromium workflows passed with mocked auth/provider/API boundaries.
- Lint, Next type generation/TypeScript, optimized production build, lockfile dry-run and whitespace checks passed.

The exact checks/boundaries and measured tiny-set NLP evaluation are in [VERIFICATION.md](VERIFICATION.md). The sample evaluation is not a broad benchmark.

## 12. Verified across real local components

Actual Python analysis → private HTTP bearer gateway → validated Next route → local SQL analysis/completion/phrase persistence → SM-2 review → updated 35 XP, two daily activities and UTC streak. Separate SQL tests verify both writing drafts, quotas, duplicate prevention, rollback, ownership and privacy. Actual trained linguistic annotations and local embedding inference ran; models were downloaded into an ignored cache.

## 13. Mocked verification

Browser sign-in/provider transport and storage responses are explicit test fixtures; the pages/controls/navigation are real Next/Chromium. Paid OpenRouter/ElevenLabs were not called. LanguageTool success/failure and offset mapping were mocked. Physical microphone/recognition services were not used; typed fallback and simulated permission denial were exercised. Hosted Supabase identity/transport was replaced in the local integration, while actual SQL/functions/RLS executed locally.

## 14. Remaining limitations

Hosted auth/email/Google/Supabase deployment, real microphone/ASR/audio playback, live paid providers, Docker execution and production capacity have not been verified. Broad grammar coverage needs LanguageTool; without it the explicitly partial local rules cannot catch every error. Semantic similarity is a provisional relevance signal with model token limits; comprehension correctness is not certified. Small development examples do not establish generalization. Automatic retention scheduling, phoneme assessment and CEFR certification are not implemented. Detailed history/trend query limits and older missing daily XP are documented.

## 15. Required user setup

Copy/fill `.env.local` with a real Supabase project and shared NLP secret; review/apply migrations 001/002/003 as appropriate, load seed content only if needed, and configure auth callback URLs. NLP dependencies/models are already installed in this workspace, and reproducible setup is documented for another machine. Start both services. Add optional provider keys only if using those features. Complete staging acceptance with real accounts/microphone/provider configuration before deploying; deployment requires an explicit separate decision.

## Exact file inventory

Modified existing files:

- `.gitignore`
- `README.md`
- `eslint.config.mjs`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `seed-db.js`
- `src/app/api/ai/analyze/route.ts`
- `src/app/api/tts/route.ts`
- `src/app/app/cycle/page.tsx`
- `src/app/app/layout.tsx`
- `src/app/app/page.tsx`
- `src/app/app/progress/page.tsx`
- `src/app/app/read/page.tsx`
- `src/app/app/review/page.tsx`
- `src/app/app/shadow/page.tsx`
- `src/app/app/speak/page.tsx`
- `src/app/app/test/page.tsx`
- `src/app/app/write/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/components/ai-feedback/ContextEngineCard.tsx`
- `src/components/ai-feedback/PacingEngineRenderer.tsx`
- `src/components/ai-feedback/ShadowingFeedback.tsx`
- `src/components/ai-feedback/SpeakingFeedback.tsx`
- `src/components/ai-feedback/WritingFeedback.tsx`
- `src/components/portfolio/Contact.jsx`
- `src/components/portfolio/Hero.jsx`
- `src/components/progress/ProgressChart.tsx`
- `src/lib/ai/db-helpers.ts`
- `src/lib/ai/schemas.ts`
- `src/lib/sm2.ts`
- `src/lib/streak.ts`
- `src/lib/supabase/middleware.ts`
- `test-db.js`

New files:

- `.env.example`
- `.nvmrc`
- `compose.yaml`
- `docs/AUDIT.md`
- `docs/DEPLOYMENT.md`
- `docs/IMPLEMENTATION.md`
- `docs/IMPLEMENTATION_REPORT.md`
- `docs/NLP_ARCHITECTURE.md`
- `docs/TESTING.md`
- `docs/VERIFICATION.md`
- `nlp-service/.dockerignore`
- `nlp-service/.python-version`
- `nlp-service/Dockerfile`
- `nlp-service/README.md`
- `nlp-service/app/__init__.py`
- `nlp-service/app/core.py`
- `nlp-service/app/engine.py`
- `nlp-service/app/fluency.py`
- `nlp-service/app/grammar.py`
- `nlp-service/app/main.py`
- `nlp-service/app/pipeline.py`
- `nlp-service/app/reading.py`
- `nlp-service/app/schemas.py`
- `nlp-service/app/semantics.py`
- `nlp-service/app/shadowing.py`
- `nlp-service/app/vocabulary.py`
- `nlp-service/constraints.txt`
- `nlp-service/evaluation/evaluate.py`
- `nlp-service/evaluation/results.json`
- `nlp-service/evaluation/samples.json`
- `nlp-service/pytest.ini`
- `nlp-service/requirements-dev.txt`
- `nlp-service/requirements-semantic.txt`
- `nlp-service/requirements.txt`
- `nlp-service/scripts/download_models.py`
- `nlp-service/scripts/generate_fixtures.py`
- `nlp-service/tests/test_engine.py`
- `playwright.config.ts`
- `src/app/api/grammar/check/route.ts`
- `src/app/api/learning/chunks/route.ts`
- `src/app/api/learning/complete/route.ts`
- `src/app/api/learning/definition/route.ts`
- `src/app/api/learning/draft/route.ts`
- `src/app/api/learning/history/route.ts`
- `src/app/api/learning/passage/route.ts`
- `src/app/api/learning/privacy/route.ts`
- `src/app/api/learning/review/route.ts`
- `src/app/api/learning/summary/route.ts`
- `src/app/api/learning/test/route.ts`
- `src/app/api/nlp/analyze/route.ts`
- `src/app/app/account/page.tsx`
- `src/app/app/activities/page.tsx`
- `src/app/app/profile/page.tsx`
- `src/components/AppShell.tsx`
- `src/components/nlp/AnalysisResults.tsx`
- `src/components/nlp/LearningSummary.tsx`
- `src/components/nlp/PhraseMeaning.tsx`
- `src/components/nlp/ReadingInsights.tsx`
- `src/components/nlp/SpeechRecorder.tsx`
- `src/components/progress/LearningTrends.tsx`
- `src/lib/api/server.ts`
- `src/lib/learning/analytics.ts`
- `src/lib/nlp/client.ts`
- `src/lib/nlp/contracts.ts`
- `supabase/migrations/003_nlp_learning.sql`
- `tests/e2e/auth-provider.mjs`
- `tests/e2e/workflows.spec.ts`
- `tests/fixtures/cycle-analysis.json`
- `tests/fixtures/read-analysis.json`
- `tests/fixtures/shadow-analysis.json`
- `tests/fixtures/write-analysis.json`
- `tests/integration/nlp-http.test.ts`
- `tests/unit/api.test.ts`
- `tests/unit/database.test.ts`
- `tests/unit/learning.test.ts`
- `tests/unit/rendering.test.tsx`
- `vitest.config.mts`
- `vitest.integration.config.mts`
