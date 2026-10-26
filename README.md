# FluentFive — daily English practice with a private NLP engine

FluentFive combines reading, speaking, shadowing, writing and spaced repetition in the existing Next.js application. Its central Read → Think → Speak cycle now connects text analysis, feedback, selected-phrase saving and private learning history. Scores are internal practice signals, not certified English proficiency assessments.

## Stack and architecture

- Next.js **16.2.9**, React **19.2.4**, TypeScript, Tailwind 4, locally bundled Inter/Outfit fonts.
- Supabase Auth/PostgreSQL/RLS and transactional learning functions.
- Private Python 3.11 FastAPI service with spaCy, optional CPU sentence-transformer embeddings, conservative grammar rules and optional LanguageTool.
- Existing optional OpenRouter contextual coaching and ElevenLabs reference audio.
- Browser speech recognition and local-only shadowing audio playback; existing SM-2 review and Recharts.

The browser calls authenticated Next.js routes. Next.js calls Python with a private bearer credential. Python is a separate process/deployment; a Next.js serverless host will not start it automatically. See [architecture and methodology](docs/NLP_ARCHITECTURE.md).

## Local setup

Use Node 24 LTS (the tested version is in `.nvmrc`) and Python 3.11. The default Python on some machines is too new for the pinned NLP wheels.

```sh
npm ci
cp .env.example .env.local
```

Fill `.env.local` with your Supabase project URL/public key and a random `NLP_SERVICE_API_KEY` (`openssl rand -hex 32`). Use the same key in Next.js and Python. Do not put private keys in any `NEXT_PUBLIC_*` variable. The application no longer needs a Supabase service-role key at runtime.

In your own Supabase project's SQL editor, review and apply in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_ai_feedback.sql`
3. `supabase/migrations/003_nlp_learning.sql`
4. `supabase/migrations/004_learning_storage_access.sql`
5. `supabase/seed.sql` for a new project that has no learning content

Migration 003 is additive and preserves existing records. It adds private analysis/history/review tables and transactional saves, quotas and rewards. It intentionally restricts direct XP updates; deploy its matching application changes together. Do not blindly rerun initial migrations or seed existing content. No hosted migration has been executed by this implementation.

Migration 004 explicitly grants the application's required access while preserving RLS, repairs missing legacy-account profiles, and reloads the API schema cache. It is safe to rerun after 003. For history/storage errors, see [the targeted repair guide](docs/STORAGE_TROUBLESHOOTING.md).

Configure Supabase Auth's site URL and redirect allowlist for `http://localhost:3000/auth/callback`. Email magic links work with the project's email settings. Enable/configure Google in Supabase only if you want Google sign-in. Add your production callback separately when deploying.

Install NLP and models:

```sh
python3.11 -m venv nlp-service/.venv
nlp-service/.venv/bin/python -m pip install -c nlp-service/constraints.txt -r nlp-service/requirements-dev.txt
nlp-service/.venv/bin/python -m pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
nlp-service/.venv/bin/python -m pip install -c nlp-service/constraints.txt -r nlp-service/requirements-semantic.txt
nlp-service/.venv/bin/python nlp-service/scripts/download_models.py
```

Start the private service in one terminal:

```sh
cd nlp-service
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file ../.env.local --no-access-log
```

Start Next.js in another, from the root:

```sh
npm run dev
```

Open `http://localhost:3000`. Without Supabase configuration, the landing page and setup screen still render; private learning requires a configured account. An alternative NLP container setup is `docker compose --env-file .env.local up --build nlp`; see [service README](nlp-service/README.md).

## Configuration and graceful degradation

All variables are documented in [.env.example](.env.example).

| Configuration | Effect |
|---|---|
| Supabase public URL/key | Required for accounts and private persistence. Missing configuration gets a setup screen/503 API response. |
| NLP service URL/private key | Required for integrated analysis; failed requests retain text and offer retry. |
| `NLP_ENABLE_EMBEDDINGS=true` plus installed model | Semantic similarity and coherence. Without it these results are explicitly unavailable. |
| `LANGUAGETOOL_URL` | Broader grammar coverage through a private/self-hosted or public HTTP service. Without it Python reports conservative local rules only. The standalone writing fallback retains the old public LanguageTool integration and labels its limited output. |
| `OPENROUTER_API_KEY` | Optional contextual phrase explanations, generated prompts and writing polish. Without it the cycle uses a safe personal prompt; local NLP still works. |
| `ELEVENLABS_API_KEY` | Optional model audio. Browser voice, local recording and text alignment remain available without it. |

Optional AI/voice providers may charge for usage. No zero-cost guarantee is made. Database quotas are 100 NLP requests, 20 contextual AI calls and 40 TTS calls per user per UTC day; cached exact NLP requests do not consume another quota. These are application limits, not provider billing controls.

## Learner workflow

1. Sign in and open the dashboard or Fluency Cycle.
2. Read a passage from Wikipedia (attributed) or the existing seeded library. Explore actual phrases, definitions and reading questions.
3. Study the target phrases; prepare for 45 seconds around a personal prompt.
4. Speak for up to 90 seconds using live browser transcription. A typed fallback has no measured speaking pace.
5. Review grammar spans, vocabulary statistics/suggestions, relevance, WPM and an internal practice score. Unavailable capabilities are explicit.
6. Select corrections or missed phrases and save. A single database transaction records completion, selected flashcards, XP and streak; retries do not duplicate rewards.
7. Review due cards with SM-2 and inspect session feedback, learning patterns and progress.

Standalone two-minute speaking, difficulty-based shadowing, active reading, writing/rewrite, grammar/chunk quizzes and flashcards remain available. Writing corrections are opt-in; both drafts persist. Shadowing keeps model audio/local playback and displays word-level lexical alignment, never a text-derived acoustic pronunciation score.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:nlp
npm run evaluate:nlp
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:integration
```

`evaluate:nlp` needs `NLP_ENABLE_EMBEDDINGS=true` in the shell for real semantic evaluation; alternatively run the command shown in the service README. Test fixtures are locally authored; paid APIs and hosted authentication are mocked in browser tests. Database tests execute migrations in embedded PostgreSQL. The cross-service test starts a real local FastAPI process and executes the Next gateway/SQL persistence while substituting only the Supabase auth/client transport. Tests do not touch production.

See [testing details](docs/TESTING.md), [executed verification](docs/VERIFICATION.md), [implementation report](docs/IMPLEMENTATION_REPORT.md), and [deployment guide](docs/DEPLOYMENT.md). Hosted OAuth, hosted Supabase, physical microphone behavior and paid provider responses require your own configured environment; they are not implied by passing mocked tests.
