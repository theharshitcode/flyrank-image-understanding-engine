# BUILDLOG

## 2026-10-31 — Initial implementation

- Built the Node.js + Express API, PostgreSQL schema, Docker Compose stack, and separate background worker.
- Added Gemini Vision structured-output adapter and strict Zod validation for subject/category/attributes/caption/confidence.
- Added Gemini embeddings, cosine ranking, mismatch guard, review endpoints, queue retries, daily AI-call budget, and usage/cost ledger.
- Added unit tests for vector similarity, schema validation, and fox/wolf/category guard cases.
- AI assistance was used to draft the initial scaffold and documentation. The implementation still requires local execution, live Gemini verification, a licensed 40+ image corpus, and measured threshold tuning. Any generated code must be reviewed and understood before submission.
- Known gap: the brief's 10+ labeled evaluation examples and 40+ licensed image corpus are not yet populated. No precision number is claimed until the corpus is labeled and evaluated.


## Provider change — 2026-10-31
- Replaced Gemini vision integration with Groq chat-completions using Qwen 3.8 27B multimodal JSON mode.
- Replaced Gemini embeddings with local Ollama `all-minilm`; no Gemini key or Gemini service remains in the runtime path.
- The Groq key shared in chat must be revoked and replaced. It is not stored in source or project files.
- The GPT-OSS 20B model is text-only; Qwen 3.8 27B is used for the image input requirement.


## Groq provider configuration update
- Kept the project on the Groq provider path; no Gemini dependency is used.
- Vision model: `qwen/qwen3.8-27b` for image inputs.
- Text model: `openai/gpt-oss-20b` via the OpenAI-compatible Groq Responses API to enrich article search text.
- Embeddings remain local through Ollama `all-minilm`, so image and post vectors share one embedding space.
- Added per-model estimated usage-cost accounting. Rates are estimates and must be rechecked against Groq's current pricing before final submission.
- The API key must be a newly rotated key stored only in the local `.env`; no key is included in this repository.
