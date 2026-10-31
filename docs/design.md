# Design document

## Problem
Editors need the most relevant image for each article. Keyword/file-name search can return a visually similar but incorrect subject. The system must explain why a candidate was rejected and prefer no result over a misleading result.

## Data model
- `images`: original source, stored local path, MIME/size, processing status.
- `image_metadata`: schema-validated subject, category, attributes, caption, confidence.
- `image_vectors`: caption embedding.
- `posts`: title/content plus optional expected subject/category constraints.
- `post_vectors`: article embedding.
- `suggestions`: ranked candidate, similarity, final score, decision and explanation.
- `reviews`: human approval/rejection.
- `jobs`: retryable asynchronous work queue.
- `ai_costs`: provider/model/operation/usage/status/duration ledger.

## API surface
See README API reference. Ingestion and matching return `202 Accepted`; clients poll resources/results. Read endpoints expose current state and rejection explanations.

## Guard decision
`score = cosine_similarity(post_vector, image_vector) × vision_confidence`. Reject if confidence, similarity or score is below configured thresholds, or if a declared expected category/subject differs from the extracted metadata. Reasons are accumulated and returned to the reviewer.

## Explicit non-goals
No public end-user frontend, no multi-tenant SaaS, no large-scale vector database, no image generation, and no automated claims of correctness without a labeled evaluation set.


## AI providers

- Vision classification: Groq API using `qwen/qwen3.8-27b` (multimodal).
- Text embeddings: local Ollama `all-minilm` model, shared vector space for image captions and article text.
- API credentials: `GROQ_API_KEY` in `.env` only; never commit secrets.
