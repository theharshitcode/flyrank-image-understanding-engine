# EVIDENCE

Evidence is recorded only after a command or acceptance probe has actually run. Do not mark a requirement complete by copying an expected output.

## Local checks

- [x] `node --check` on all JavaScript files — passed.

- [x] `node --test` — 6 passed, 0 failed, 2 skipped because dependencies were not installed in this build environment. Re-run `npm test` after `npm install` so the Zod schema tests execute.
- [ ] `docker compose up --build` — paste successful startup logs here.
- [ ] `GET /health` — paste actual JSON response here.

## Acceptance probes from the FlyRank brief

- [ ] Probe 1: batch-process corpus; show schema-valid tags and at least one low-confidence flagged image.
- [ ] Probe 2: red-fox post ranks the correct fox image first, with wolf/dog lower.
- [ ] Probe 3: force a wolf candidate for a fox post; show category/subject mismatch rejection.
- [ ] Probe 4: unrelated post returns `no_confident_match` with reasons.
- [ ] Probe 5: run evaluation; paste measured top-1 precision and ensure README matches.
- [ ] Probe 6: show cost/usage log entries for every vision and embedding call.

## Required shared engineering patterns

- [x] Layered architecture — routes, services, providers, persistence separated in code.
- [x] Boundary validation — Zod validation on post/image inputs and model output.
- [x] Background job — PostgreSQL queue, independent worker, retries and failed-job state.
- [x] Real persistence — PostgreSQL migration and indexes.
- [x] Idempotency — `POST /api/images` supports `Idempotency-Key`; the key and original response are persisted, with an advisory transaction lock preventing duplicate image creation for concurrent retries.
- [x] Secrets via environment — `.env` ignored and `.env.example` supplied.
- [x] AI cost/usage tracking — per-call ledger and daily call-count budget; exact billed cost is not claimed.

## Important

The checked items above describe implementation present in source. Runtime/behavioral acceptance probes remain unchecked until executed against a populated local environment.
