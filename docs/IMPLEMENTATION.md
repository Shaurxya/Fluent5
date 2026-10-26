# Implementation checklist

Status is updated from executed checks, not inferred from file creation.

- [x] Inspect baseline routes, schema, auth, integrations and algorithms; preserve clean baseline branch.
- [x] Install dependencies; read installed Next.js route/testing guides; record baseline lint/types/build.
- [x] Typed private FastAPI service with bounded requests, health, model lifecycle and partial failures.
- [x] Real tokenization, segmentation, POS/lemmas/NER, grammar, vocabulary, semantics, fluency, word alignment, reading and writing.
- [x] Authenticated Next gateway; validated contracts; bounded timeouts; quotas; optional contextual AI.
- [x] Additive RLS migrations and transactional, idempotent session/analysis/flashcard/review persistence.
- [x] Central cycle: passage → hints → preparation → recording → analysis → remember → history.
- [x] Integrate standalone speaking, writing, shadowing and active reading without losing existing functions.
- [x] Real dashboard, progress, history and personalized recommendations; complete navigation.
- [x] Regression/unit/API/rendering tests; reproducible local evaluation; mocked browser workflow tests.
- [x] Lint, type check, production build, Python tests, local cross-service verification.
- [x] Setup, deployment, privacy, methodology, limitations and exact verification report.

## Verification boundary

The application is integrated and locally verified. Hosted Supabase/OAuth, paid providers, actual microphone hardware, Docker execution and production deployment still require the configured staging environment. Full executed results and limitations are in VERIFICATION.md; no live external success is inferred from mocked tests.
