# Deploying the two-service application

No production resources were created or deployed in this implementation.

## Next.js

Use a Node-compatible Next.js host or existing Vercel setup. Set public Supabase URL/key and application origin **before build**; Next embeds public values in client bundles. Set private NLP URL/key and optional OpenRouter/ElevenLabs keys only on the server. Configure Supabase Auth callback allowlists for the real origin. `npm ci && npm run build` compiles the application; `npm start` serves it.

The Python service does not execute inside a Vercel Next function. Deploy it separately as a long-lived CPU container or VM. Use private networking where available, or an authenticated TLS endpoint reachable only by the application. Keep the private key synchronized and rotate it with both services. Never use a `NEXT_PUBLIC_` prefix for this key.

## NLP service

`nlp-service/Dockerfile` has a non-root user, pinned requirements/constraints and model revisions, optional embedding build argument, and a liveness health check. `compose.yaml` supplies a local-only deployment with a read-only filesystem, temporary scratch space and resource limits. Those definitions are source-reviewed configuration; a Docker image has not been built here.

For local containers:

```sh
docker compose --env-file .env.local up --build nlp
```

For a hosted image, build with `WITH_EMBEDDINGS=true`; set `NLP_ENABLE_EMBEDDINGS=true`, a random bearer key and optional private LanguageTool URL. Start one worker initially. Each worker holds its own models/caches, so blindly increasing worker count multiplies memory use. Begin with 2 CPU / 2GB RAM and measure actual workload/cold-start/memory behavior before selecting production capacity; this is an initial configuration, not a measured capacity guarantee.

Models must be present before serving requests. No request triggers a model download. `/health` measures liveness; authenticated `/capabilities` indicates configuration. Send a synthetic non-private analysis after deploy to verify actual models; an enabled flag alone does not establish inference readiness. Cold embedding initialization may take seconds. Restrict ingress/body size/connections at the reverse proxy as well as using the service limits.

## Database rollout

Back up and test on staging. Review 003 before applying; it preserves historical rows but changes how rewards are written. Apply it with the application release that switches completions to RPCs, because old browser clients cannot directly update XP afterward. Initial migrations/seed are for new projects, not a repeated production upgrade procedure. Verify RLS using two normal user accounts.

Detailed attempts are new records; older daily activity remains available. No historical analysis backfill is invented. Rollback should be a reviewed forward migration/application change; do not drop learner tables.

## Costs, operations and retention

Application quotas reserve calls atomically before provider work. Failures can consume quota; reservation favors predictable cost protection over perfect refunds. Quotas do not control provider-side bills globally. Configure provider budget controls manually if desired; none were changed here.

The service logs mode/latency, not private text. Disable request-body logging in hosting proxies/error collectors, limit log access and use separate staging keys. Browser speech recognition and third-party coaching/grammar/voice services process the content described in the account page. Prefer self-hosted LanguageTool for private writing.

There is no automatic retention job. Choose a policy for analyses, completion payloads, writing drafts, flashcards and backups. Users can explicitly delete AI/NLP analyses; this retains completion/draft/flashcard records. To implement time-based retention, add a reviewed scheduled job with a documented policy and test its ownership/foreign-key behavior in staging. Never run an ad-hoc destructive query against production.

Production readiness still requires hosted auth/RLS checks, real microphone and paid-provider acceptance, a Docker/staging run, capacity testing, monitoring and an operational retention policy. See `VERIFICATION.md` for what was actually executed locally.
