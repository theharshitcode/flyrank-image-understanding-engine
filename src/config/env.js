require('dotenv').config();
const path = require('node:path');
module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://flyrank:flyrank@localhost:5432/flyrank',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqBaseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  visionModel: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b',
  textModel: process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-20b',
  embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'all-minilm',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  aiProvider: 'groq+ollama',
  imageStorageDir: path.resolve(process.env.IMAGE_STORAGE_DIR || './data/images'),
  lowConfidenceThreshold: Number(process.env.LOW_CONFIDENCE_THRESHOLD || 0.65),
  minSimilarityThreshold: Number(process.env.MIN_SIMILARITY_THRESHOLD || 0.55),
  minMatchScore: Number(process.env.MIN_MATCH_SCORE || 0.62),
  workerPollMs: Number(process.env.WORKER_POLL_MS || 2500),
  maxRetries: Number(process.env.MAX_RETRIES || 3),
  maxAiCallsPerDay: Number(process.env.MAX_AI_CALLS_PER_DAY || 500),
  maxImageBytes: Number(process.env.MAX_IMAGE_BYTES || 8000000)
};
