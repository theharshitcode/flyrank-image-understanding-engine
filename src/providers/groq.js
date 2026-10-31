const fs = require('node:fs/promises');
const env = require('../config/env');
const { AppError } = require('../lib/errors');
const { imageUnderstandingSchema } = require('../lib/schemas');
const OpenAI = require('openai');

let openaiClient;
function getOpenAIClient() {
  if (!env.groqApiKey) throw new AppError('GROQ_API_KEY is missing. Add a newly generated key to .env.', 503, 'AI_NOT_CONFIGURED');
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: env.groqApiKey, baseURL: env.groqBaseUrl });
  return openaiClient;
}

async function groqChat(messages) {
  if (!env.groqApiKey) throw new AppError('GROQ_API_KEY is missing. Add a newly generated key to .env.', 503, 'AI_NOT_CONFIGURED');
  const response = await fetch(`${env.groqBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.groqApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.visionModel,
      messages,
      temperature: 0.1,
      max_completion_tokens: 1200,
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(60000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(payload.error?.message || `Groq request failed (${response.status})`, 502, 'AI_PROVIDER_ERROR');
  return payload;
}

async function understandImage(storagePath) {
  const bytes = await fs.readFile(storagePath);
  const mimeType = storagePath.toLowerCase().endsWith('.png') ? 'image/png' : storagePath.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const prompt = `Inspect this image for an editorial image library. Return one JSON object with exactly these fields: subject (canonical visible subject), category (broad noun), attributes (array of short visible traits), caption (one concise sentence), confidence (number from 0 to 1). Be specific: distinguish red fox from gray wolf and domestic dog. Do not infer details that are not visible. If uncertain, use a low confidence score. No markdown.`;
  const started = Date.now();
  const result = await groqChat([{
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${bytes.toString('base64')}` } }
    ]
  }]);
  const rawText = result.choices?.[0]?.message?.content || '';
  let parsed;
  try { parsed = JSON.parse(rawText); } catch { throw new AppError('Groq vision model returned invalid JSON; response was not accepted.', 502, 'INVALID_AI_JSON'); }
  const validated = imageUnderstandingSchema.safeParse(parsed);
  if (!validated.success) throw new AppError(`Vision output failed schema validation: ${validated.error.issues.map(i => i.path.join('.')).join(', ')}`, 502, 'INVALID_AI_SCHEMA');
  return { data: validated.data, durationMs: Date.now() - started, usage: result.usage || {} };
}


async function expandPostForSearch(title, content) {
  const started = Date.now();
  const response = await getOpenAIClient().responses.create({
    model: env.textModel,
    reasoning: { effort: 'low' },
    input: [
      { role: 'system', content: 'You prepare search text for an editorial image matching system. Extract only concepts explicitly supported by the article. Preserve exact named subjects and species. Add a few safe synonyms or common names only when clearly equivalent. Never broaden a specific animal into a related animal. Return concise plain text, not JSON.' },
      { role: 'user', content: `Article title: ${title}\nArticle content: ${content}\n\nReturn: canonical subject, category, and 3-6 concise visual search phrases.` }
    ]
  });
  const expandedText = response.output_text?.trim();
  if (!expandedText) throw new AppError('Groq text model returned an empty search expansion.', 502, 'EMPTY_AI_OUTPUT');
  return { text: `${title}\n${content}\n${expandedText}`, durationMs: Date.now() - started, usage: response.usage || {} };
}

// Groq provides vision classification and article-query enrichment. Embeddings use the local Ollama
// all-minilm model so semantic matching does not depend on Gemini or another paid API.
async function embedText(text) {
  const started = Date.now();
  const response = await fetch(`${env.ollamaBaseUrl}/api/embed`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.embeddingModel, input: text }),
    signal: AbortSignal.timeout(60000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(payload.error || `Ollama embedding request failed (${response.status})`, 502, 'EMBEDDING_PROVIDER_ERROR');
  const values = payload.embeddings?.[0];
  if (!Array.isArray(values) || !values.length || values.some(v => !Number.isFinite(v))) throw new AppError('Ollama returned invalid vector data.', 502, 'INVALID_EMBEDDING');
  return { embedding: values, durationMs: Date.now() - started, usage: { prompt_tokens: payload.prompt_eval_count || 0 } };
}
module.exports = { understandImage, expandPostForSearch, embedText };
