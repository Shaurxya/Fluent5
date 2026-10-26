# FluentFive private NLP service

Python 3.11, FastAPI, spaCy 3.8.7 / en_core_web_sm 3.8.0. Optional sentence-transformers 5.1.2 / MiniLM embeddings run on CPU. The Next.js server is the authenticated public gateway. This service has no learner database credentials and never stores audio or raw transcripts on disk.

## Install and run

From the repository root:

```sh
python3.11 -m venv nlp-service/.venv
nlp-service/.venv/bin/python -m pip install -c nlp-service/constraints.txt -r nlp-service/requirements-dev.txt
nlp-service/.venv/bin/python -m pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
nlp-service/.venv/bin/python -m pip install -c nlp-service/constraints.txt -r nlp-service/requirements-semantic.txt
nlp-service/.venv/bin/python nlp-service/scripts/download_models.py
```

Copy root `.env.example` to `.env.local`; set a random shared `NLP_SERVICE_API_KEY`. Then:

```sh
cd nlp-service
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file ../.env.local --no-access-log
```

The base installation works without embeddings, with semantic results explicitly unavailable. The trained spaCy model is required for the tests that verify POS, lemmas and NER. No model downloads occur during analysis. Restart after installing or changing a model. `constraints.txt` pins the tested Python environment, including optional packages; requirements files choose which packages to install.

Alternative, from root:

```sh
docker compose --env-file .env.local up --build nlp
```

This publishes only to loopback. Container builds require model-download access. The Docker configuration is supplied but has not been built or deployed in this workspace.

## Contract

- `GET /health`: public process liveness, no learner data.
- `GET /capabilities`: bearer key required; reports configured capabilities.
- `GET /openapi.json`: bearer key required, full Pydantic request/response specification.
- `POST /nlp/analyze`: bearer key required; combined analysis, reuse one parsed document.

```json
{
  "mode": "cycle",
  "text": "I goes to college yesterday and meet my friends.",
  "prompt": "Describe a recent experience with your friends.",
  "targets": ["sharing stories"],
  "duration_seconds": 90
}
```

Modes: `grammar`, `vocabulary`, `semantics`, `speak`, `write`, `read`, `shadow`, `cycle`. Shadowing also requires `reference`. Reading returns questions and text difficulty; writing returns paragraph/register suggestions. The combined contract returns useful shared analyses for every mode. Supply `expected_answer` for comparing comprehension answers with an extractive anchor.

Offsets are **Unicode code points**, half-open `[start,end)`, relative to the exact original string. They are not byte offsets or JavaScript UTF-16 offsets. The frontend explicitly converts/slices by code point. LanguageTool UTF-16 offsets are converted before merging.

Limits: 12,000 characters per text/reference, 2,000 per prompt/answer anchor, 30 target phrases of at most 180 characters, 100KB request body including streamed requests; shadowing 500 words per text. Upstream grammar timeout 8s; four active analyses per worker; queue wait 2s; overall service timeout 40s. NLP gateway timeout 45s. Models are process singletons; embeddings use a bounded 256-entry hash-keyed vector cache. Cancellation of an in-progress CPU inference does not forcibly terminate its native thread; production CPU/memory limits and reverse-proxy connection limits remain necessary.

Errors use `{ "error": { "code": "...", "message": "..." } }`, without input echoes or stack traces. Missing LanguageTool/embeddings give explicit partial results. Missing service authentication fails closed. No acoustic metrics or certified proficiency estimates are produced.

## Verify

```sh
cd nlp-service
.venv/bin/python -m pytest -q
NLP_ENABLE_EMBEDDINGS=true .venv/bin/python -m evaluation.evaluate
```

Evaluation uses locally authored CC0 development examples. The result file reports actual counts/metrics and latency; it does not demonstrate generalization. See root `docs/NLP_ARCHITECTURE.md`, `docs/TESTING.md` and `docs/VERIFICATION.md`.
