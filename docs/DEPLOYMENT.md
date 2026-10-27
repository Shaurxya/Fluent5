# Deploying the two-service application

No production resources were created or deployed in this implementation.

## Next.js

Use a Node-compatible Next.js host or existing Vercel setup. Set public Supabase URL/key and application origin **before build**; Next embeds public values in client bundles. Set private NLP URL/key and optional OpenRouter/ElevenLabs keys only on the server. Configure Supabase Auth callback allowlists for the real origin. `npm ci && npm run build` compiles the application; `npm start` serves it.

The Python service does not execute inside a Vercel Next function. Deploy it separately as a long-lived CPU container or VM. Use private networking where available, or an authenticated TLS endpoint reachable only by the application. Keep the private key synchronized and rotate it with both services. Never use a `NEXT_PUBLIC_` prefix for this key.

The NLP image binds to `0.0.0.0:$PORT`, falling back to `8000` only if `PORT` is absent/empty. Its health check uses the same port. Render's default `PORT=10000` is supported without an override; leave custom Docker Command blank. The integration test executes the Dockerfile's actual CMD and health command with a nondefault host port before testing inference/storage. It does not build a Docker image.

## NLP service

`nlp-service/Dockerfile` has a non-root user, pinned requirements/constraints and model revisions, optional embedding build argument, and a liveness health check. `compose.yaml` supplies a local-only deployment with a read-only filesystem, temporary scratch space and resource limits. Those definitions are source-reviewed configuration; a Docker image has not been built here.

For local containers:

```sh
docker compose --env-file .env.local up --build nlp
```

For a hosted image, build with `WITH_EMBEDDINGS=true`; set `NLP_ENABLE_EMBEDDINGS=true`, a random bearer key and optional private LanguageTool URL. Start one worker initially. Each worker holds its own models/caches, so blindly increasing worker count multiplies memory use. Begin with 2 CPU / 2GB RAM and measure actual workload/cold-start/memory behavior before selecting production capacity; this is an initial configuration, not a measured capacity guarantee.

Models must be present before serving requests. No request triggers a model download. `/health` measures liveness; authenticated `/capabilities` indicates configuration. Send a synthetic non-private analysis after deploy to verify actual models; an enabled flag alone does not establish inference readiness. Cold embedding initialization may take seconds. Restrict ingress/body size/connections at the reverse proxy as well as using the service limits.

### Troubleshooting a running Render service

- `{"detail":"Not Found"}` at the service's base URL is expected: there is no `/` homepage. Use `/health` for liveness. `/nlp/analyze` accepts authenticated POST requests, not a browser GET. Set Vercel's `NLP_SERVICE_URL` to the base URL, without `/health` or `/nlp/analyze`.
- `Semantic model unavailable` means that analysis could not obtain embeddings. Set both `WITH_EMBEDDINGS=true` and `NLP_ENABLE_EMBEDDINGS=true` in Render, then rebuild and deploy. Render translates environment variables to Docker build arguments (https://render.com/docs/docker#environment-variable-translation). Confirm the build installs the semantic requirements and runs `scripts/download_models.py`; a build log comparing `"false" = "true"` skips these steps. If it still fails, check for the safe `embedding_model_unavailable` or `embedding_inference_failed` log messages and memory-related restarts. `/capabilities` reports the enable flag, not successful inference. Retry a new analysis after setup; old saved results retain their original limitations.
- Phrase explanations use Next.js `/api/ai/analyze` and OpenRouter, independently of the Python semantic model. Configure `OPENROUTER_API_KEY` in Vercel, verify access to `OPENROUTER_MODEL_FAST` (default `openai/gpt-4o-mini`), then redeploy Vercel. Check the authenticated request's status/error in the browser Network panel if it still fails. A dictionary fallback explains an individual word only; saving a phrase to review does not require an AI explanation. Missing-key, authentication, quota, or provider errors must not be mistaken for failed flashcard saves.

## Database rollout

Back up and test on staging. Review 003 before applying; it preserves historical rows but changes how rewards are written. Apply it with the application release that switches completions to RPCs, because old browser clients cannot directly update XP afterward. Initial migrations/seed are for new projects, not a repeated production upgrade procedure. Verify RLS using two normal user accounts.

Detailed attempts are new records; older daily activity remains available. No historical analysis backfill is invented. Rollback should be a reviewed forward migration/application change; do not drop learner tables.

## Costs, operations and retention

Application quotas reserve calls atomically before provider work. Failures can consume quota; reservation favors predictable cost protection over perfect refunds. Quotas do not control provider-side bills globally. Configure provider budget controls manually if desired; none were changed here.

The service logs mode/latency, not private text. Disable request-body logging in hosting proxies/error collectors, limit log access and use separate staging keys. Browser speech recognition and third-party coaching/grammar/voice services process the content described in the account page. Prefer self-hosted LanguageTool for private writing.

There is no automatic retention job. Choose a policy for analyses, completion payloads, writing drafts, flashcards and backups. Users can explicitly delete AI/NLP analyses; this retains completion/draft/flashcard records. To implement time-based retention, add a reviewed scheduled job with a documented policy and test its ownership/foreign-key behavior in staging. Never run an ad-hoc destructive query against production.

Production readiness still requires hosted auth/RLS checks, real microphone and paid-provider acceptance, a Docker/staging run, capacity testing, monitoring and an operational retention policy. See `VERIFICATION.md` for what was actually executed locally.
